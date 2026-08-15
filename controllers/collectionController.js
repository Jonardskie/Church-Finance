// controllers/collectionController.js

const pool = require("../config/db");


// ============================================================
// HELPERS
// ============================================================

function normalizeCalculationType(type) {
    const value = String(type || "NONE").toUpperCase();

    if (["NONE", "PERCENTAGE", "FIXED"].includes(value)) {
        return value;
    }

    return "NONE";
}


function calculateAccounting(amount, type, rate) {
    const safeAmount = Number(amount) || 0;
    const safeRate = Number(rate) || 0;

    if (type === "PERCENTAGE") {
        return Number((safeAmount * safeRate / 100).toFixed(2));
    }

    if (type === "FIXED") {
        return Number(safeRate.toFixed(2));
    }

    return 0;
}


function formatReceiptNumber(id, date) {
    const d = new Date(date);

    const year = String(d.getFullYear()).slice(-2);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const sequence = String(id).padStart(3, "0");

    return `R${year}${month}${sequence}`;
}


// ============================================================
// GET ALL COLLECTIONS
// ============================================================

exports.getCollections = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                c.*,

                CASE
                    WHEN c.ps_type = 'PERCENTAGE'
                        THEN CONCAT(c.ps_rate, '%')
                    WHEN c.ps_type = 'FIXED'
                        THEN CONCAT('₱', TO_CHAR(c.ps_rate, 'FM999999990.00'))
                    ELSE '—'
                END AS ps_display,

                CASE
                    WHEN c.apportionment_type = 'PERCENTAGE'
                        THEN CONCAT(c.apportionment_rate, '%')
                    WHEN c.apportionment_type = 'FIXED'
                        THEN CONCAT('₱', TO_CHAR(c.apportionment_rate, 'FM999999990.00'))
                    ELSE '—'
                END AS apportionment_display

            FROM collections c
            ORDER BY
                COALESCE(c.collection_date, c.date) DESC,
                c.id DESC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error("GET COLLECTIONS ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
};


// ============================================================
// CREATE COLLECTION
// ============================================================

exports.createCollection = async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            date,
            member_id,
            member_name,
            type,
            fund,
            amount,
            status,
            payment_method,
            reference_no,
            target
        } = req.body;

        if (!date) {
            return res.status(400).json({
                error: "Collection date is required."
            });
        }

        if (!type) {
            return res.status(400).json({
                error: "Collection type is required."
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "A valid collection amount is required."
            });
        }

        await client.query("BEGIN");

        // ----------------------------------------------------
        // GET ACCOUNTING RULE
        // ----------------------------------------------------

        const configResult = await client.query(
            `
            SELECT *
            FROM collection_calculations
            WHERE LOWER(collection_type_name) = LOWER($1)
              AND active = TRUE
            LIMIT 1
            `,
            [type]
        );

        let config = configResult.rows[0];

        // If no configuration exists, use safe NONE defaults.
        if (!config) {
            config = {
                ps_type: "NONE",
                ps_rate: 0,
                apportionment_type: "NONE",
                apportionment_rate: 0
            };
        }

        const psType = normalizeCalculationType(config.ps_type);
        const psRate = Number(config.ps_rate) || 0;

        const apportionmentType =
            normalizeCalculationType(config.apportionment_type);

        const apportionmentRate =
            Number(config.apportionment_rate) || 0;

        // ----------------------------------------------------
        // CALCULATE
        // ----------------------------------------------------

        const psAmount = calculateAccounting(
            numericAmount,
            psType,
            psRate
        );

        const apportionmentAmount = calculateAccounting(
            numericAmount,
            apportionmentType,
            apportionmentRate
        );

        // ----------------------------------------------------
        // INSERT COLLECTION
        // ----------------------------------------------------

        const insertResult = await client.query(
            `
            INSERT INTO collections
            (
                date,
                collection_date,
                member_id,
                member_name,
                type,
                fund_category,
                amount,
                status,

                payment_method,
                reference_no,
                target,

                ps_type,
                ps_rate,
                ps_amount,

                apportionment_type,
                apportionment_rate,
                apportionment_amount
            )
            VALUES
            (
                $1,
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,

                $8,
                $9,
                $10,

                $11,
                $12,
                $13,

                $14,
                $15,
                $16
            )
            RETURNING *
            `,
            [
                date,
                member_id || null,
                member_name || "ANONYMOUS",
                type,
                fund || "General Fund",
                numericAmount,
                status || "pending",

                payment_method || "CASH",
                reference_no || null,
                target || fund || type,

                psType,
                psRate,
                psAmount,

                apportionmentType,
                apportionmentRate,
                apportionmentAmount
            ]
        );

        const collection = insertResult.rows[0];

        // ----------------------------------------------------
        // GENERATE RECEIPT NUMBER
        // ----------------------------------------------------

        const receiptNo = formatReceiptNumber(
            collection.id,
            date
        );

        const finalResult = await client.query(
            `
            UPDATE collections
            SET receipt_no = $1
            WHERE id = $2
            RETURNING *
            `,
            [
                receiptNo,
                collection.id
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Collection recorded successfully.",
            data: finalResult.rows[0]
        });

    } catch (err) {

        await client.query("ROLLBACK");

        console.error("CREATE COLLECTION ERROR:", err);

        res.status(500).json({
            error: err.message
        });

    } finally {

        client.release();
    }
};


// ============================================================
// VERIFY COLLECTION
// ============================================================

exports.verifyCollection = async (req, res) => {

    try {

        const result = await pool.query(
            `
            UPDATE collections
            SET status = 'verified'
            WHERE id = $1
            RETURNING *
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Collection not found."
            });
        }

        res.json({
            message: "Collection verified successfully.",
            data: result.rows[0]
        });

    } catch (err) {

        console.error("VERIFY COLLECTION ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
};


// ============================================================
// DELETE COLLECTION
// ============================================================

exports.deleteCollection = async (req, res) => {

    try {

        const result = await pool.query(
            `
            DELETE FROM collections
            WHERE id = $1
            RETURNING *
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Collection not found."
            });
        }

        res.json({
            message: "Collection deleted successfully."
        });

    } catch (err) {

        console.error("DELETE COLLECTION ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
};


// ============================================================
// GET COLLECTIONS BY MEMBER
// ============================================================

exports.getCollectionsByMember = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM collections
            WHERE member_id = $1
            ORDER BY
                COALESCE(collection_date, date) DESC,
                id DESC
            `,
            [req.params.member_id]
        );

        res.json(result.rows);

    } catch (err) {

        console.error("GET MEMBER COLLECTIONS ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
};


// ============================================================
// GET CALCULATION CONFIGURATION
// ============================================================

exports.getCalculationConfigs = async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT *
            FROM collection_calculations
            ORDER BY collection_type_name ASC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error("GET CALCULATION CONFIG ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
};


// ============================================================
// UPDATE CALCULATION CONFIGURATION
// ============================================================

exports.updateCalculationConfig = async (req, res) => {

    try {

        const {
            collection_type_id,
            collection_type_name,
            ps_type,
            ps_rate,
            apportionment_type,
            apportionment_rate,
            active
        } = req.body;

        if (!collection_type_name) {
            return res.status(400).json({
                error: "Collection type name is required."
            });
        }

        const safePsType = normalizeCalculationType(ps_type);
        const safeAppType = normalizeCalculationType(apportionment_type);

        const result = await pool.query(
            `
            INSERT INTO collection_calculations
            (
                collection_type_id,
                collection_type_name,

                ps_type,
                ps_rate,

                apportionment_type,
                apportionment_rate,

                active,
                updated_at
            )
            VALUES
            (
                $1,
                $2,

                $3,
                $4,

                $5,
                $6,

                $7,
                CURRENT_TIMESTAMP
            )

            ON CONFLICT (collection_type_id)
            DO UPDATE SET

                collection_type_name =
                    EXCLUDED.collection_type_name,

                ps_type =
                    EXCLUDED.ps_type,

                ps_rate =
                    EXCLUDED.ps_rate,

                apportionment_type =
                    EXCLUDED.apportionment_type,

                apportionment_rate =
                    EXCLUDED.apportionment_rate,

                active =
                    EXCLUDED.active,

                updated_at =
                    CURRENT_TIMESTAMP

            RETURNING *
            `,
            [
                collection_type_id || null,
                collection_type_name,

                safePsType,
                Number(ps_rate) || 0,

                safeAppType,
                Number(apportionment_rate) || 0,

                active !== false
            ]
        );

        res.json({
            message: "Calculation settings saved.",
            data: result.rows[0]
        });

    } catch (err) {

        console.error("UPDATE CALCULATION CONFIG ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
};