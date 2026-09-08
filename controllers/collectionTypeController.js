const pool = require("../config/db");

// ============================================================
// HELPER: SYNC CALCULATIONS & PROPAGATE TO ALL COLLECTIONS
// ============================================================
async function syncCalculationsAndCollections(client, collectionTypeId, typeName, psCalcType, psRate, appCalcType, appRate) {
    const trimmedName = String(typeName || "").trim();
    const psTypeUpper = String(psCalcType || "none").toUpperCase();
    const appTypeUpper = String(appCalcType || "none").toUpperCase();
    const psRateNum = Number(psRate || 0);
    const appRateNum = Number(appRate || 0);

    // 1. Sync collection_calculations table if present
    try {
        await client.query(`
            INSERT INTO collection_calculations (collection_type_id, collection_type_name, ps_type, ps_rate, apportionment_type, apportionment_rate, active, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
            ON CONFLICT (collection_type_id) DO UPDATE SET
                collection_type_name = EXCLUDED.collection_type_name,
                ps_type = EXCLUDED.ps_type,
                ps_rate = EXCLUDED.ps_rate,
                apportionment_type = EXCLUDED.apportionment_type,
                apportionment_rate = EXCLUDED.apportionment_rate,
                active = TRUE,
                updated_at = NOW()
        `, [collectionTypeId, trimmedName, psTypeUpper, psRateNum, appTypeUpper, appRateNum]);
    } catch (e) {
        console.log("collection_calculations sync warning:", e.message);
    }

    // 2. Propagate new rates & recalculate ps_amount and apportionment_amount for ALL existing collections of this type
    const updateColsResult = await client.query(`
        UPDATE collections
        SET
            ps_type = $1::text,
            ps_rate = $2::numeric,
            ps_amount = CASE
                WHEN $1::text = 'PERCENTAGE' THEN ROUND((amount::numeric * $2::numeric / 100.0), 2)
                WHEN $1::text = 'FIXED' THEN $2::numeric
                ELSE 0
            END,
            apportionment_type = $3::text,
            apportionment_rate = $4::numeric,
            apportionment_amount = CASE
                WHEN $3::text = 'PERCENTAGE' THEN ROUND((amount::numeric * $4::numeric / 100.0), 2)
                WHEN $3::text = 'FIXED' THEN $4::numeric
                ELSE 0
            END
        WHERE LOWER(type) = LOWER($5::text)
    `, [psTypeUpper, psRateNum, appTypeUpper, appRateNum, trimmedName]);

    console.log(`✅ Propagated updated percentage to ${updateColsResult.rowCount} existing collection record(s) for "${trimmedName}" (PS: ${psRateNum}% [${psTypeUpper}], Apportionment: ${appRateNum}% [${appTypeUpper}]).`);
}


// ============================================================
// GET ALL COLLECTION TYPES
// ============================================================

exports.getTypes = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                description,
                status,
                ps_calculation_type,
                ps_rate,
                apportionment_calculation_type,
                apportionment_rate,
                COALESCE(display_order, id) AS display_order
            FROM collection_types
            ORDER BY COALESCE(display_order, id) ASC, id ASC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error("GET COLLECTION TYPES ERROR:", err);

        res.status(500).json({
            error: err.message
        });

    }
};


// ============================================================
// CREATE COLLECTION TYPE
// ============================================================

exports.createType = async (req, res) => {

    const {
        name,
        description,
        status,
        ps_calculation_type,
        ps_rate,
        apportionment_calculation_type,
        apportionment_rate
    } = req.body;

    try {

        if (!name || !name.trim()) {

            return res.status(400).json({
                error: "Collection type name is required."
            });

        }


        const validCalculationTypes = [
            "none",
            "percentage",
            "fixed"
        ];


        if (
            !validCalculationTypes.includes(
                ps_calculation_type
            )
        ) {

            return res.status(400).json({
                error: "Invalid PS calculation type."
            });

        }


        if (
            !validCalculationTypes.includes(
                apportionment_calculation_type
            )
        ) {

            return res.status(400).json({
                error: "Invalid Apportionment calculation type."
            });

        }


        const finalPSRate =
            ps_calculation_type === "none"
                ? 0
                : Number(ps_rate || 0);


        const finalApportionmentRate =
            apportionment_calculation_type === "none"
                ? 0
                : Number(apportionment_rate || 0);


        if (
            !Number.isFinite(finalPSRate) ||
            finalPSRate < 0
        ) {

            return res.status(400).json({
                error: "Invalid PS rate."
            });

        }


        if (
            !Number.isFinite(finalApportionmentRate) ||
            finalApportionmentRate < 0
        ) {

            return res.status(400).json({
                error: "Invalid Apportionment rate."
            });

        }


        if (
            ps_calculation_type === "percentage" &&
            finalPSRate > 100
        ) {

            return res.status(400).json({
                error: "PS percentage cannot exceed 100%."
            });

        }


        if (
            apportionment_calculation_type === "percentage" &&
            finalApportionmentRate > 100
        ) {

            return res.status(400).json({
                error: "Apportionment percentage cannot exceed 100%."
            });

        }


        const result = await pool.query(
            `
            INSERT INTO collection_types
            (
                name,
                description,
                status,
                ps_calculation_type,
                ps_rate,
                apportionment_calculation_type,
                apportionment_rate,
                display_order
            )
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM collection_types))
            RETURNING *
            `,
            [
                name.trim(),
                description || null,
                status || "Active",
                ps_calculation_type,
                finalPSRate,
                apportionment_calculation_type,
                finalApportionmentRate
            ]
        );

        const newType = result.rows[0];

        // Propagate calculations to existing collections & sync calculations table
        try {
            await syncCalculationsAndCollections(
                pool,
                newType.id,
                newType.name,
                newType.ps_calculation_type,
                newType.ps_rate,
                newType.apportionment_calculation_type,
                newType.apportionment_rate
            );
        } catch (syncErr) {
            console.error("Sync error in createType:", syncErr);
        }

        res.status(201).json(newType);

    } catch (err) {

        console.error("CREATE COLLECTION TYPE ERROR:", err);

        res.status(500).json({
            error: err.message
        });

    }
};


// ============================================================
// UPDATE COLLECTION TYPE
// ============================================================

exports.updateType = async (req, res) => {

    const {
        name,
        description,
        status,
        ps_calculation_type,
        ps_rate,
        apportionment_calculation_type,
        apportionment_rate
    } = req.body;


    try {

        if (!name || !name.trim()) {

            return res.status(400).json({
                error: "Collection type name is required."
            });

        }


        const validCalculationTypes = [
            "none",
            "percentage",
            "fixed"
        ];


        if (
            !validCalculationTypes.includes(
                ps_calculation_type
            )
        ) {

            return res.status(400).json({
                error: "Invalid PS calculation type."
            });

        }


        if (
            !validCalculationTypes.includes(
                apportionment_calculation_type
            )
        ) {

            return res.status(400).json({
                error: "Invalid Apportionment calculation type."
            });

        }


        const finalPSRate =
            ps_calculation_type === "none"
                ? 0
                : Number(ps_rate || 0);


        const finalApportionmentRate =
            apportionment_calculation_type === "none"
                ? 0
                : Number(apportionment_rate || 0);


        if (
            !Number.isFinite(finalPSRate) ||
            finalPSRate < 0
        ) {

            return res.status(400).json({
                error: "Invalid PS rate."
            });

        }


        if (
            !Number.isFinite(finalApportionmentRate) ||
            finalApportionmentRate < 0
        ) {

            return res.status(400).json({
                error: "Invalid Apportionment rate."
            });

        }


        if (
            ps_calculation_type === "percentage" &&
            finalPSRate > 100
        ) {

            return res.status(400).json({
                error: "PS percentage cannot exceed 100%."
            });

        }


        if (
            apportionment_calculation_type === "percentage" &&
            finalApportionmentRate > 100
        ) {

            return res.status(400).json({
                error: "Apportionment percentage cannot exceed 100%."
            });

        }


        const result = await pool.query(
            `
            UPDATE collection_types
            SET
                name = $1,
                description = $2,
                status = $3,
                ps_calculation_type = $4,
                ps_rate = $5,
                apportionment_calculation_type = $6,
                apportionment_rate = $7
            WHERE id = $8
            RETURNING *
            `,
            [
                name.trim(),
                description || null,
                status || "Active",
                ps_calculation_type,
                finalPSRate,
                apportionment_calculation_type,
                finalApportionmentRate,
                req.params.id
            ]
        );


        if (!result.rows.length) {

            return res.status(404).json({
                error: "Collection type not found."
            });

        }

        const updatedType = result.rows[0];

        // Propagate updated percentages & rates to ALL existing collection records
        try {
            await syncCalculationsAndCollections(
                pool,
                updatedType.id,
                updatedType.name,
                updatedType.ps_calculation_type,
                updatedType.ps_rate,
                updatedType.apportionment_calculation_type,
                updatedType.apportionment_rate
            );
        } catch (syncErr) {
            console.error("Sync error in updateType:", syncErr);
        }

        res.json(updatedType);

    } catch (err) {

        console.error("UPDATE COLLECTION TYPE ERROR:", err);

        res.status(500).json({
            error: err.message
        });

    }
};


// ============================================================
// DELETE COLLECTION TYPE
// ============================================================

exports.deleteType = async (req, res) => {

    try {

        const result = await pool.query(
            `
            DELETE FROM collection_types
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id]
        );


        if (!result.rows.length) {

            return res.status(404).json({
                error: "Collection type not found."
            });

        }


        res.json({
            message: "Deleted successfully"
        });

    } catch (err) {

        console.error("DELETE COLLECTION TYPE ERROR:", err);

        res.status(500).json({
            error: err.message
        });

    }
};


// ============================================================
// REORDER COLLECTION TYPES (DRAG & DROP)
// ============================================================

exports.reorderTypes = async (req, res) => {
    const { order } = req.body; // Array of IDs in new sequence: [1, 5, 2, 3]

    if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: "An array of collection type IDs is required." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (let i = 0; i < order.length; i++) {
            const typeId = parseInt(order[i], 10);
            if (!isNaN(typeId)) {
                await client.query(
                    "UPDATE collection_types SET display_order = $1 WHERE id = $2",
                    [i + 1, typeId]
                );
            }
        }

        const username = req.user?.username || "Admin";
        await client.query(
            "INSERT INTO audit_logs (user_name, action_type, table_name, details) VALUES ($1, $2, $3, $4)",
            [username, "REORDER_COLLECTION_TYPES", "collection_types", `Reordered ${order.length} collection types.`]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Collection types reordered successfully."
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("REORDER COLLECTION TYPES ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};