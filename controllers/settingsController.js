// controllers/settingsController.js

const pool = require("../config/db");

// ============================================================
// GET CHURCH SETTINGS
// ============================================================
exports.getChurchSettings = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM church_settings WHERE id = 1 LIMIT 1"
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    church_name: "Maui United Methodist Church",
                    church_acronym: "MAUI UMC",
                    member_id_prefix: "MUMC",
                    currency_symbol: "₱",
                    address: "",
                    contact_number: "",
                    email: "",
                    vision_statement: "",
                    logo_url: "/images/logo.png"
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        console.error("GET CHURCH SETTINGS ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve church settings."
        });
    }
};

// ============================================================
// UPDATE CHURCH SETTINGS (Admin Only)
// ============================================================
exports.updateChurchSettings = async (req, res) => {
    try {
        const {
            church_name,
            church_acronym,
            member_id_prefix,
            currency_symbol,
            address,
            contact_number,
            email,
            vision_statement,
            logo_url
        } = req.body;

        if (!church_name || !church_name.trim()) {
            return res.status(400).json({
                success: false,
                error: "Church name is required."
            });
        }

        const cleanName = church_name.trim();
        const cleanAcronym = (church_acronym && church_acronym.trim()) || "CHURCH";
        const cleanPrefix = (member_id_prefix && member_id_prefix.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "")) || "MEM";
        const cleanCurrency = (currency_symbol && currency_symbol.trim()) || "₱";

        const updateResult = await pool.query(
            `UPDATE church_settings 
             SET church_name = $1,
                 church_acronym = $2,
                 member_id_prefix = $3,
                 currency_symbol = $4,
                 address = $5,
                 contact_number = $6,
                 email = $7,
                 vision_statement = $8,
                 logo_url = $9,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = 1
             RETURNING *`,
            [
                cleanName,
                cleanAcronym,
                cleanPrefix,
                cleanCurrency,
                address ? address.trim() : "",
                contact_number ? contact_number.trim() : "",
                email ? email.trim() : "",
                vision_statement ? vision_statement.trim() : "",
                logo_url ? logo_url.trim() : "/images/logo.png"
            ]
        );

        // Record in audit log
        try {
            const userName = (req.user && req.user.username) || "admin";
            await pool.query(
                `INSERT INTO audit_logs (user_name, action_type, table_name, details, created_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                [
                    userName,
                    "UPDATE_SETTINGS",
                    "church_settings",
                    `Updated church organization settings: Name="${cleanName}", Acronym="${cleanAcronym}", Prefix="${cleanPrefix}"`
                ]
            );
        } catch (auditErr) {
            console.error("Audit log error for settings:", auditErr.message);
        }

        res.json({
            success: true,
            message: "Church profile settings updated successfully.",
            data: updateResult.rows[0]
        });

    } catch (err) {
        console.error("UPDATE CHURCH SETTINGS ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update church settings."
        });
    }
};
