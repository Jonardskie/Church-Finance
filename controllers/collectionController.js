// controllers/collectionController.js

const pool = require("../config/db");


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

        const userRole = (req.user && req.user.role ? req.user.role : "").toLowerCase();
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