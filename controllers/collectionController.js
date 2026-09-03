// controllers/collectionController.js

const pool = require("../config/db");
const XLSX = require("xlsx");


// ============================================================
// HELPERS
// ============================================================

function clean(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === "" ? null : text;
}

function getCurrentUser(req) {
    return {
        username:
            clean(req.user?.username) ||
            clean(req.user?.name) ||
            clean(req.user?.email) ||
            "Admin",
        role:
            clean(req.user?.role) ||
            ""
    };
}

function auditDetails(action, collection, extra = "") {
    return [
        action,
        `Receipt: ${collection.receipt_no || "N/A"}`,
        `Donor: ${collection.member_name || "ANONYMOUS"}`,
        `Amount: ${collection.amount || 0}`,
        extra
    ]
        .filter(Boolean)
        .join(" | ");
}

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
                COALESCE(c.collection_date, c.date)::date AS date,
                COALESCE(c.collection_date, c.date)::date AS collection_date,

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

// Support both single-item and multi-item payloads
        const {
            date,
            member_id,
            member_name,
            fund,
            status,
            payment_method,
            reference_no,
            target,
            // New fields for multi-item support
            items,
            // Fallback legacy fields
            type,
            amount
        } = req.body;

        const userRole = (req.user && req.user.role ? req.user.role : "").toLowerCase();
        const finalStatus = (userRole === "admin") ? (status || "pending") : "pending";

        if (!date) {
            return res.status(400).json({ error: "Collection date is required." });
        }

        // Helper to insert a single collection entry (reused for each item)
        const insertEntry = async (entry) => {
            const { type: entryType, amount: entryAmount } = entry;
            if (!entryType) {
                throw new Error("Collection type is required for each item.");
            }
            const numericAmt = Number(entryAmount);
            if (!Number.isFinite(numericAmt) || numericAmt <= 0) {
                throw new Error("A valid collection amount is required for each item.");
            }
            // Get accounting config for this type
            const cfgResult = await client.query(
                `SELECT * FROM collection_calculations WHERE LOWER(collection_type_name) = LOWER($1) AND active = TRUE LIMIT 1`,
                [entryType]
            );
            let cfg = cfgResult.rows[0];
            if (!cfg) {
                cfg = { ps_type: "NONE", ps_rate: 0, apportionment_type: "NONE", apportionment_rate: 0 };
            }
            const psType = normalizeCalculationType(cfg.ps_type);
            const psRate = Number(cfg.ps_rate) || 0;
            const apportionmentType = normalizeCalculationType(cfg.apportionment_type);
            const apportionmentRate = Number(cfg.apportionment_rate) || 0;
            const psAmount = calculateAccounting(numericAmt, psType, psRate);
            const apportionmentAmount = calculateAccounting(numericAmt, apportionmentType, apportionmentRate);

            const insertResult = await client.query(
                `INSERT INTO collections (
                    date, collection_date, member_id, member_name, type, fund_category, amount, status,
                    payment_method, reference_no, target,
                    ps_type, ps_rate, ps_amount,
                    apportionment_type, apportionment_rate, apportionment_amount
                ) VALUES (
                    $1, $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10,
                    $11, $12, $13,
                    $14, $15, $16
                ) RETURNING *`,
                [
                    date,
                    member_id || null,
                    member_name || "ANONYMOUS",
                    entryType,
                    fund || "General Fund",
                    numericAmt,
                    finalStatus,
                    payment_method || "CASH",
                    reference_no || null,
                    target || fund || entryType,
                    psType,
                    psRate,
                    psAmount,
                    apportionmentType,
                    apportionmentRate,
                    apportionmentAmount
                ]
            );
            const collection = insertResult.rows[0];
            // Generate receipt number
            const receiptNo = formatReceiptNumber(collection.id, date);
            await client.query(`UPDATE collections SET receipt_no = $1 WHERE id = $2 RETURNING *`, [receiptNo, collection.id]);

            // Audit log
            const { username } = getCurrentUser(req);
            await client.query(
                `INSERT INTO audit_logs (user_name, action_type, table_name, details) VALUES ($1, $2, $3, $4)`,
                [username, "CREATE_COLLECTION", "collections", auditDetails("Recorded collection", collection)]
            );
            return collection.id;
        };

        if (Array.isArray(items) && items.length) {
            // Start a transaction for batch insertion
            await client.query("BEGIN");
            // Detect duplicate types in the request
            const typeSet = new Set();
            for (const it of items) {
                if (typeSet.has(it.type)) {
                    return res.status(400).json({ error: "Duplicate collection type in request payload." });
                }
                typeSet.add(it.type);
            }
            const createdIds = [];
            for (const it of items) {
                const id = await insertEntry(it);
                createdIds.push(id);
            }
            await client.query("COMMIT");
            return res.status(201).json({ ids: createdIds });
        }

        // Fallback to original single-item handling
        if (!type) {
            return res.status(400).json({ error: "Collection type is required." });
        }
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: "A valid collection amount is required." });
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
                finalStatus,

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

        const { username } = getCurrentUser(req);

        await client.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "CREATE_COLLECTION",
                "collections",
                auditDetails("Recorded collection", finalResult.rows[0])
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

        const { username } = getCurrentUser(req);

        await pool.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "VERIFY_COLLECTION",
                "collections",
                auditDetails("Verified collection", result.rows[0])
            ]
        );

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
// BATCH VERIFY COLLECTIONS (ADMIN ONLY)
// ============================================================

exports.verifyBatchCollections = async (req, res) => {
    try {
        const { ids, date } = req.body;

        if ((!Array.isArray(ids) || ids.length === 0) && !date) {
            return res.status(400).json({
                error: "Please provide a list of collection IDs or a date to verify."
            });
        }

        let result;
        if (Array.isArray(ids) && ids.length > 0) {
            const numericIds = ids.map(Number).filter(n => Number.isFinite(n));
            if (numericIds.length === 0) {
                return res.status(400).json({ error: "Invalid collection IDs provided." });
            }

            result = await pool.query(
                `UPDATE collections
                 SET status = 'verified'
                 WHERE id = ANY($1::int[]) AND status = 'pending'
                 RETURNING id, amount, type, member_name`,
                [numericIds]
            );
        } else if (date) {
            result = await pool.query(
                `UPDATE collections
                 SET status = 'verified'
                 WHERE (collection_date = $1 OR date = $1) AND status = 'pending'
                 RETURNING id, amount, type, member_name`,
                [date]
            );
        }

        const updatedCount = result ? result.rowCount : 0;
        const totalAmount = result ? result.rows.reduce((sum, r) => sum + Number(r.amount || 0), 0) : 0;

        const { username } = getCurrentUser(req);
        await pool.query(
            `INSERT INTO audit_logs (user_name, action_type, table_name, details)
             VALUES ($1, $2, $3, $4)`,
            [
                username,
                "BATCH_VERIFY_COLLECTIONS",
                "collections",
                JSON.stringify({
                    verifiedCount: updatedCount,
                    totalAmount: totalAmount,
                    collectionIds: result ? result.rows.map(r => r.id) : []
                })
            ]
        );

        res.json({
            message: `${updatedCount} collection(s) verified successfully.`,
            updatedCount,
            totalAmount
        });

    } catch (err) {
        console.error("BATCH VERIFY ERROR:", err);
        res.status(500).json({
            error: err.message
        });
    }
};

// -----------------------------------------------------------
// UPDATE COLLECTION (EDIT)
exports.updateCollection = async (req, res) => {
    const { id } = req.params;
    const { date, member_id, member_name, type, amount, status, payment_method, reference_no, target, fund } = req.body;

    // Basic validation
    if (!date) return res.status(400).json({ error: "Collection date is required." });
    if (!type) return res.status(400).json({ error: "Collection type is required." });
    const numericAmt = Number(amount);
    if (!Number.isFinite(numericAmt) || numericAmt <= 0) return res.status(400).json({ error: "A valid collection amount is required." });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Fetch previous state for audit
        const oldResult = await client.query(`SELECT * FROM collections WHERE id = $1`, [id]);
        if (oldResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Collection record not found." });
        }
        const oldRow = oldResult.rows[0];

        const userRole = (req.user && req.user.role ? req.user.role : "").toLowerCase();
        if (userRole === "secretary" && String(oldRow.status).toLowerCase() === "verified") {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Access Restricted: Verified collections are locked and cannot be edited by Secretary." });
        }

        // Prevent duplicate type for same member/date (excluding current record)
        const dup = await client.query(
            `SELECT 1 FROM collections WHERE member_id=$1 AND COALESCE(collection_date, date)=$2 AND type=$3 AND id <> $4`,
            [member_id, date, type, id]
        );
        if (dup.rowCount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Duplicate collection type for this member/date." });
        }

        // Fetch calculation rules for the updated collection type
        const cfgResult = await client.query(
            `SELECT * FROM collection_calculations WHERE LOWER(collection_type_name) = LOWER($1) AND active = TRUE LIMIT 1`,
            [type]
        );
        const config = cfgResult.rows[0];
        const psType = config ? config.ps_type : (oldRow.ps_type || "NONE");
        const psRate = config ? Number(config.ps_rate) : Number(oldRow.ps_rate || 0);
        const apportionmentType = config ? config.apportionment_type : (oldRow.apportionment_type || "NONE");
        const apportionmentRate = config ? Number(config.apportionment_rate) : Number(oldRow.apportionment_rate || 0);

        const psAmount = calculateAccounting(numericAmt, psType, psRate);
        const apportionmentAmount = calculateAccounting(numericAmt, apportionmentType, apportionmentRate);

        const finalStatus = (userRole === "admin") ? (status || oldRow.status || "pending") : (oldRow.status || "pending");

        const updateResult = await client.query(
            `UPDATE collections SET
                date = $1,
                collection_date = $1,
                member_id = $2,
                member_name = $3,
                type = $4,
                fund_category = $5,
                amount = $6,
                status = $7,
                payment_method = $8,
                reference_no = $9,
                target = $10,
                ps_type = $11,
                ps_rate = $12,
                ps_amount = $13,
                apportionment_type = $14,
                apportionment_rate = $15,
                apportionment_amount = $16
             WHERE id = $17 RETURNING *`,
            [
                date,
                member_id || null,
                member_name || "ANONYMOUS",
                type,
                target || fund || "General Fund",
                numericAmt,
                finalStatus,
                payment_method || "CASH",
                reference_no || null,
                target || fund || type,
                psType,
                psRate,
                psAmount,
                apportionmentType,
                apportionmentRate,
                apportionmentAmount,
                id
            ]
        );
        const updated = updateResult.rows[0];

        // Audit log for update with before/after details
        const { username } = getCurrentUser(req);
        const auditDesc = `Updated collection ID ${id}: ` +
            `date ${oldRow.collection_date || oldRow.date || "N/A"} → ${updated.collection_date || updated.date}, ` +
            `member ${oldRow.member_id || "N/A"} → ${updated.member_id}, ` +
            `type ${oldRow.type || "N/A"} → ${updated.type}, ` +
            `amount ${oldRow.amount || 0} → ${updated.amount}, ` +
            `status ${oldRow.status || "N/A"} → ${updated.status}`;
        await client.query(
            `INSERT INTO audit_logs (user_name, action_type, table_name, details) VALUES ($1, $2, $3, $4)`,
            [username, "UPDATE_COLLECTION", "collections", auditDesc]
        );
        await client.query('COMMIT');
        res.json({ message: "Collection updated.", collection: updated });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("UPDATE COLLECTION ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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

        const { username } = getCurrentUser(req);

        await pool.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "DELETE_COLLECTION",
                "collections",
                auditDetails("Deleted collection", result.rows[0])
            ]
        );

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

        const { username } = getCurrentUser(req);
        await pool.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "UPDATE_CALCULATION_CONFIG",
                "collection_calculations",
                `Saved calculation rule for ${result.rows[0].collection_type_name} | PS: ${result.rows[0].ps_type} (${result.rows[0].ps_rate}) | Apportionment: ${result.rows[0].apportionment_type} (${result.rows[0].apportionment_rate})`
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


// ============================================================
// GET AUTHENTICATED MEMBER CONTRIBUTIONS (USER SIDE)
// ============================================================

exports.getMyContributions = async (req, res) => {
    try {
        const username = req.user?.username || "";
        const name = req.user?.name || "";
        const { year, type, status, search } = req.query;

        let query = `
            SELECT
                c.id,
                c.receipt_no,
                COALESCE(c.collection_date, c.date)::date AS date,
                c.member_id,
                c.member_name,
                c.type,
                c.fund_category,
                c.amount,
                c.payment_method,
                c.reference_no,
                c.status,
                c.target
            FROM collections c
            WHERE (
                (c.member_id IS NOT NULL AND LOWER(TRIM(c.member_id)) = LOWER(TRIM($1)))
                OR (c.member_name IS NOT NULL AND LOWER(TRIM(c.member_name)) = LOWER(TRIM($2)))
                OR (c.member_name IS NOT NULL AND LOWER(TRIM(c.member_name)) = LOWER(TRIM($1)))
            )
        `;

        const values = [username, name];

        if (year && year !== "all") {
            values.push(year);
            query += ` AND EXTRACT(YEAR FROM COALESCE(c.collection_date, c.date)) = $${values.length}`;
        }

        if (type && type !== "all") {
            values.push(type);
            query += ` AND LOWER(c.type) = LOWER($${values.length})`;
        }

        if (status && status !== "all") {
            values.push(status);
            query += ` AND LOWER(c.status) = LOWER($${values.length})`;
        }

        if (search && search.trim()) {
            values.push(`%${search.trim().toLowerCase()}%`);
            query += ` AND (
                LOWER(COALESCE(c.receipt_no, '')) LIKE $${values.length}
                OR LOWER(COALESCE(c.type, '')) LIKE $${values.length}
                OR LOWER(COALESCE(c.fund_category, '')) LIKE $${values.length}
                OR LOWER(COALESCE(c.payment_method, '')) LIKE $${values.length}
            )`;
        }

        query += ` ORDER BY COALESCE(c.collection_date, c.date) DESC, c.id DESC`;

        const result = await pool.query(query, values);
        res.json(result.rows);

    } catch (err) {
        console.error("GET MY CONTRIBUTIONS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};


// ============================================================
// GET AUTHENTICATED MEMBER SUMMARY & BREAKDOWN (USER SIDE)
// ============================================================

exports.getMySummary = async (req, res) => {
    try {
        const username = req.user?.username || "";
        const name = req.user?.name || "";
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const result = await pool.query(
            `
            SELECT
                c.id,
                c.receipt_no,
                COALESCE(c.collection_date, c.date)::date AS date,
                c.type,
                c.fund_category,
                c.amount,
                c.payment_method,
                c.status,
                EXTRACT(YEAR FROM COALESCE(c.collection_date, c.date))::int AS year,
                EXTRACT(MONTH FROM COALESCE(c.collection_date, c.date))::int AS month
            FROM collections c
            WHERE (
                (c.member_id IS NOT NULL AND LOWER(TRIM(c.member_id)) = LOWER(TRIM($1)))
                OR (c.member_name IS NOT NULL AND LOWER(TRIM(c.member_name)) = LOWER(TRIM($2)))
                OR (c.member_name IS NOT NULL AND LOWER(TRIM(c.member_name)) = LOWER(TRIM($1)))
            )
            ORDER BY COALESCE(c.collection_date, c.date) DESC
            `,
            [username, name]
        );

        const rows = result.rows;

        let totalLifetime = 0;
        let totalYTD = 0;
        let totalMTD = 0;
        let verifiedCount = 0;
        let pendingCount = 0;

        const fundBreakdownMap = {};
        const methodBreakdownMap = {};
        const monthlyBreakdown = Array(12).fill(0);
        const yearlyBreakdownMap = {};

        rows.forEach(r => {
            const amt = Number(r.amount) || 0;
            totalLifetime += amt;

            if (r.year === currentYear) {
                totalYTD += amt;
                if (r.month >= 1 && r.month <= 12) {
                    monthlyBreakdown[r.month - 1] += amt;
                }
            }

            if (r.year === currentYear && r.month === currentMonth) {
                totalMTD += amt;
            }

            if (String(r.status).toLowerCase() === "verified") {
                verifiedCount++;
            } else {
                pendingCount++;
            }

            const fundKey = (r.type || r.fund_category || "General").trim();
            if (!fundBreakdownMap[fundKey]) {
                fundBreakdownMap[fundKey] = { category: fundKey, amount: 0, count: 0 };
            }
            fundBreakdownMap[fundKey].amount += amt;
            fundBreakdownMap[fundKey].count += 1;

            const methodKey = (r.payment_method || "CASH").trim().toUpperCase();
            if (!methodBreakdownMap[methodKey]) {
                methodBreakdownMap[methodKey] = { method: methodKey, amount: 0, count: 0 };
            }
            methodBreakdownMap[methodKey].amount += amt;
            methodBreakdownMap[methodKey].count += 1;

            if (r.year) {
                yearlyBreakdownMap[r.year] = (yearlyBreakdownMap[r.year] || 0) + amt;
            }
        });

        const fundBreakdown = Object.values(fundBreakdownMap)
            .map(item => ({
                ...item,
                percentage: totalLifetime > 0 ? Number(((item.amount / totalLifetime) * 100).toFixed(1)) : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        const methodBreakdown = Object.values(methodBreakdownMap)
            .sort((a, b) => b.amount - a.amount);

        const availableYears = Object.keys(yearlyBreakdownMap).map(Number).sort((a, b) => b - a);
        if (!availableYears.includes(currentYear)) {
            availableYears.unshift(currentYear);
        }

        res.json({
            success: true,
            member: {
                memberId: username,
                name: name || username
            },
            totals: {
                lifetime: totalLifetime,
                ytd: totalYTD,
                mtd: totalMTD,
                count: rows.length,
                verifiedCount,
                pendingCount
            },
            currentYear,
            fundBreakdown,
            methodBreakdown,
            monthlyBreakdown,
            yearlyBreakdown: yearlyBreakdownMap,
            availableYears,
            recentTransactions: rows.slice(0, 10)
        });

    } catch (err) {
        console.error("GET MY SUMMARY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// SUNDAY CASH TALLY & RECONCILIATION
// ============================================================

exports.getCashTallySummary = async (req, res) => {
    const churchSlug = req.churchSlug || "maui";
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required." });
    }

    try {
        // Calculate ledger sum for date range
        const ledgerRes = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS total_count
             FROM collections
             WHERE date >= $1 AND date <= $2 AND LOWER(status) != 'voided'`,
            [startDate, endDate]
        );

        const totalLedgerAmount = Number(ledgerRes.rows[0]?.total_amount || 0);
        const collectionsCount = Number(ledgerRes.rows[0]?.total_count || 0);

        // Check for existing saved tally
        const tallyRes = await pool.query(
            `SELECT * FROM sunday_cash_counts
             WHERE start_date = $1 AND end_date = $2
             ORDER BY id DESC LIMIT 1`,
            [startDate, endDate]
        );

        const savedTally = tallyRes.rows[0] || null;

        res.json({
            success: true,
            startDate,
            endDate,
            totalLedgerAmount,
            collectionsCount,
            savedTally
        });
    } catch (err) {
        console.error("GET CASH TALLY SUMMARY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.saveCashTally = async (req, res) => {
    const churchSlug = req.churchSlug || "maui";
    const {
        startDate,
        endDate,
        serviceName,
        bills1000,
        bills500,
        bills200,
        bills100,
        bills50,
        bills20,
        coins20,
        coins10,
        coins5,
        coins1,
        coinsLoose,
        checksTotal,
        onlineTotal,
        totalPhysicalCash,
        totalLedgerAmount,
        varianceAmount,
        status,
        varianceNote,
        counterName,
        secretaryName,
        treasurerName
    } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required." });
    }

    try {
        const query = `
            INSERT INTO sunday_cash_counts (
                church_slug, start_date, end_date, service_name,
                bills_1000, bills_500, bills_200, bills_100, bills_50, bills_20,
                coins_20, coins_10, coins_5, coins_1, coins_loose,
                checks_total, online_total, total_physical_cash, total_ledger_amount,
                variance_amount, status, variance_note, counter_name, secretary_name, treasurer_name
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17, $18, $19,
                $20, $21, $22, $23, $24, $25
            )
            RETURNING *;
        `;

        const values = [
            churchSlug, startDate, endDate, serviceName || 'Sunday Worship Service',
            Number(bills1000 || 0), Number(bills500 || 0), Number(bills200 || 0), Number(bills100 || 0), Number(bills50 || 0), Number(bills20 || 0),
            Number(coins20 || 0), Number(coins10 || 0), Number(coins5 || 0), Number(coins1 || 0), Number(coinsLoose || 0),
            Number(checksTotal || 0), Number(onlineTotal || 0), Number(totalPhysicalCash || 0), Number(totalLedgerAmount || 0),
            Number(varianceAmount || 0), status || 'TALLY_MATCH', varianceNote || '', counterName || '', secretaryName || '', treasurerName || ''
        ];

        const result = await pool.query(query, values);
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        console.error("SAVE CASH TALLY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.exportCashTallyExcel = async (req, res) => {
    const churchSlug = req.churchSlug || "maui";
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required." });
    }

    try {
        // Fetch collections for date range
        const colRes = await pool.query(
            `SELECT c.receipt_no, c.date, c.member_name AS giver_name, COALESCE(ct.name, c.type, c.fund_category, 'General Fund') AS category, c.payment_method, c.amount, c.status
             FROM collections c
             LEFT JOIN collection_types ct ON c.collection_type_id = ct.id
             WHERE c.date >= $1 AND c.date <= $2 AND LOWER(c.status) != 'voided'
             ORDER BY c.date DESC, c.id DESC`,
            [startDate, endDate]
        );

        // Fetch tally details
        const tallyRes = await pool.query(
            `SELECT * FROM sunday_cash_counts
             WHERE start_date = $1 AND end_date = $2
             ORDER BY id DESC LIMIT 1`,
            [startDate, endDate]
        );

        const tally = tallyRes.rows[0] || {};
        const collections = colRes.rows;

        // SHEET 1: Financial Summary & Ledger
        const ledgerData = collections.map(c => ({
            "Receipt #": c.receipt_no || "—",
            "Date": c.date ? String(c.date).split("T")[0] : "—",
            "Donor Name": c.giver_name || "Anonymous",
            "Fund Category": c.category || "General Fund",
            "Payment Method": c.payment_method || "CASH",
            "Amount (₱)": Number(c.amount) || 0,
            "Status": c.status || "Verified"
        }));

        const wb = XLSX.utils.book_new();
        const wsLedger = XLSX.utils.json_to_sheet(ledgerData);
        wsLedger["!cols"] = [{ wch: 15 }, { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsLedger, "Financial Summary");

        // SHEET 2: Sunday Cash Count & Tally Statement
        const tallySheetData = [
            ["SUNDAY CASH COUNT & RECONCILIATION STATEMENT"],
            ["Church Slug:", churchSlug.toUpperCase()],
            ["Date Range:", `${startDate} to ${endDate}`],
            ["Service Name:", tally.service_name || "Sunday Worship Service"],
            ["Tally Status:", tally.status || "TALLY_MATCH"],
            [""],
            ["PHYSICAL CASH DENOMINATIONS", "COUNT", "SUBTOTAL (₱)"],
            ["₱1,000 Bills", tally.bills_1000 || 0, (tally.bills_1000 || 0) * 1000],
            ["₱500 Bills", tally.bills_500 || 0, (tally.bills_500 || 0) * 500],
            ["₱200 Bills", tally.bills_200 || 0, (tally.bills_200 || 0) * 200],
            ["₱100 Bills", tally.bills_100 || 0, (tally.bills_100 || 0) * 100],
            ["₱50 Bills", tally.bills_50 || 0, (tally.bills_50 || 0) * 50],
            ["₱20 Bills / Notes", tally.bills_20 || 0, (tally.bills_20 || 0) * 20],
            ["₱20 Coins", tally.coins_20 || 0, (tally.coins_20 || 0) * 20],
            ["₱10 Coins", tally.coins_10 || 0, (tally.coins_10 || 0) * 10],
            ["₱5 Coins", tally.coins_5 || 0, (tally.coins_5 || 0) * 5],
            ["₱1 Coins", tally.coins_1 || 0, (tally.coins_1 || 0) * 1],
            ["Loose Coins Total", "—", Number(tally.coins_loose) || 0],
            ["Checks Total", "—", Number(tally.checks_total) || 0],
            ["GCash / Online Transfers", "—", Number(tally.online_total) || 0],
            ["TOTAL PHYSICAL CASH COUNT", "—", Number(tally.total_physical_cash) || 0],
            [""],
            ["RECONCILIATION SUMMARY"],
            ["Total Ledger Input Amount", "—", Number(tally.total_ledger_amount) || 0],
            ["Total Physical Cash Count", "—", Number(tally.total_physical_cash) || 0],
            ["Variance (Over/Short)", "—", Number(tally.variance_amount) || 0],
            ["Variance Explanation / Notes:", tally.variance_note || "None"],
            [""],
            ["SIGNATORIES & APPROVALS"],
            ["Prepared / Counted by (Steward):", tally.counter_name || "___________________"],
            ["Recorded by (Church Secretary):", tally.secretary_name || "___________________"],
            ["Verified by (Treasurer / Admin):", tally.treasurer_name || "___________________"]
        ];

        const wsTally = XLSX.utils.aoa_to_sheet(tallySheetData);
        wsTally["!cols"] = [{ wch: 32 }, { wch: 15 }, { wch: 22 }];
        XLSX.utils.book_append_sheet(wb, wsTally, "Sunday Cash Count & Tally");

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=CFMMS_Sunday_Cash_Tally_${startDate}_to_${endDate}.xlsx`);
        return res.send(buffer);

    } catch (err) {
        console.error("EXPORT CASH TALLY EXCEL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// SIGNATORIES DROPDOWN API
// ============================================================

exports.getSignatories = async (req, res) => {
    try {
        const usersRes = await pool.query("SELECT id, username, role, full_name, name FROM users");
        const membersRes = await pool.query("SELECT id, official_name, role FROM members");

        const map = new Map();

        usersRes.rows.forEach(u => {
            const name = (u.full_name || u.name || u.username || "").trim();
            if (name) map.set(name.toLowerCase(), { name, role: (u.role || 'Member').trim() });
        });

        membersRes.rows.forEach(m => {
            const name = (m.official_name || "").trim();
            if (name && !map.has(name.toLowerCase())) {
                map.set(name.toLowerCase(), { name, role: (m.role || 'Member').trim() });
            }
        });

        const allSignatories = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

        const counters = allSignatories;

        // Officers first, then all members
        const secretaryOfficers = allSignatories.filter(s => /secretary/i.test(s.role) || /admin/i.test(s.role) || /pastor/i.test(s.role));
        const secretaryOthers = allSignatories.filter(s => !(/secretary/i.test(s.role) || /admin/i.test(s.role) || /pastor/i.test(s.role)));
        const secretaries = [...secretaryOfficers.map(s => ({ ...s, isOfficer: true })), ...secretaryOthers];

        const treasurerOfficers = allSignatories.filter(s => /treasurer/i.test(s.role) || /admin/i.test(s.role));
        const treasurerOthers = allSignatories.filter(s => !(/treasurer/i.test(s.role) || /admin/i.test(s.role)));
        const treasurers = [...treasurerOfficers.map(s => ({ ...s, isOfficer: true })), ...treasurerOthers];

        res.json({
            success: true,
            counters,
            secretaries,
            treasurers,
            allSignatories
        });
    } catch (err) {
        console.error("GET SIGNATORIES ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};