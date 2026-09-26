const pool = require("../config/db");


// ============================================================
// AUTHORIZED ROLES
// ============================================================

const AUTHORIZED_ROLES = [
    "Admin",
    "admin",
    "Treasurer",
    "treasurer",
    "Finance",
    "finance",
    "Pastor",
    "pastor"
];


// ============================================================
// CHECK AUTHORIZATION
// ============================================================

function isAuthorized(req) {

    const user = req.user || {};

    const role =
        user.role ||
        user.user_role ||
        user.role_name ||
        user.type ||
        null;


    /*
     * Authentication middleware already protects
     * the route.
     *
     * If no role is attached yet, allow the request
     * so your current authentication system remains
     * compatible.
     */

    if (!role) {
        return true;
    }


    return AUTHORIZED_ROLES.includes(role);
}


// ============================================================
// GET AUDIT LOGS
// ============================================================

exports.getAuditLogs = async (req, res) => {

    try {

        if (!isAuthorized(req)) {

            return res.status(403).json({
                error:
                    "You are not authorized to view the audit trail."
            });

        }


        const result = await pool.query(`
            SELECT
                a.id,
                COALESCE(
                    NULLIF(TRIM(u.name), ''),
                    NULLIF(TRIM(u.full_name), ''),
                    NULLIF(TRIM(a.user_name), ''),
                    'System User'
                ) AS user_name,
                a.action_type,
                a.table_name,
                a.details,
                a.created_at
            FROM audit_logs a
            LEFT JOIN users u ON LOWER(TRIM(a.user_name)) = LOWER(TRIM(u.username))
                              OR LOWER(TRIM(a.user_name)) = LOWER(TRIM(u.name))
                              OR LOWER(TRIM(a.user_name)) = LOWER(TRIM(u.full_name))
            ORDER BY a.created_at DESC
        `);


        return res.json(result.rows);

    } catch (err) {

        console.error(
            "GET AUDIT LOGS ERROR:",
            err
        );


        return res.status(500).json({
            error:
                "Failed to load audit logs."
        });

    }

};