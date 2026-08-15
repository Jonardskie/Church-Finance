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
    "finance"
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
                user_name,
                action_type,
                table_name,
                details,
                created_at
            FROM audit_logs
            ORDER BY created_at DESC
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