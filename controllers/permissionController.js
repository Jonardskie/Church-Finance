const pool = require('../config/db');

// Cache in memory to make permission checks ultra-fast (sub-millisecond)
let permissionsCache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds cache

async function fetchPermissionsFromDb() {
    const res = await pool.query("SELECT role, permissions FROM role_permissions");
    const map = {};
    res.rows.forEach(r => {
        const role = (r.role || '').toLowerCase();
        map[role] = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
    });
    permissionsCache = map;
    cacheTime = Date.now();
    return map;
}

exports.getPermissionsMap = async () => {
    if (permissionsCache && (Date.now() - cacheTime < CACHE_TTL_MS)) {
        return permissionsCache;
    }
    return await fetchPermissionsFromDb();
};

exports.getAllPermissions = async (req, res) => {
    try {
        const map = await exports.getPermissionsMap();
        res.json({ success: true, permissions: map });
    } catch (err) {
        console.error("GET ALL PERMISSIONS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getMyPermissions = async (req, res) => {
    try {
        const userRole = (req.user && req.user.role ? req.user.role : 'member').toLowerCase();
        if (userRole === 'admin') {
            // Admin has full permissions by default
            return res.json({
                success: true,
                role: 'admin',
                permissions: {
                    members: { view: true, create: true, edit: true, delete: true },
                    collections: { view: true, create: true, edit: true, verify: true, delete: true, cash_tally: true },
                    expenses: { view: true, create: true, approve: true, delete: true },
                    reports: { view: true, export_excel: true, print: true },
                    audit: { view: true, purge: true }
                }
            });
        }

        const map = await exports.getPermissionsMap();
        const perms = map[userRole] || {
            members: { view: false, create: false, edit: false, delete: false },
            collections: { view: false, create: false, edit: false, verify: false, delete: false, cash_tally: false },
            expenses: { view: false, create: false, approve: false, delete: false },
            reports: { view: false, export_excel: false, print: false },
            audit: { view: false, purge: false }
        };

        res.json({ success: true, role: userRole, permissions: perms });
    } catch (err) {
        console.error("GET MY PERMISSIONS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.updatePermissions = async (req, res) => {
    try {
        const { matrix } = req.body;
        if (!matrix || typeof matrix !== 'object') {
            return res.status(400).json({ error: "Invalid permissions matrix payload." });
        }

        for (const [role, perms] of Object.entries(matrix)) {
            const roleKey = role.toLowerCase();
            if (roleKey === 'admin') continue; // Prevent admin permission override

            await pool.query(`
                INSERT INTO role_permissions (role, permissions)
                VALUES ($1, $2)
                ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = CURRENT_TIMESTAMP
            `, [roleKey, JSON.stringify(perms)]);
        }

        // Invalidate cache
        permissionsCache = null;
        await fetchPermissionsFromDb();

        res.json({ success: true, message: "Permission matrix updated successfully." });
    } catch (err) {
        console.error("UPDATE PERMISSIONS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};
