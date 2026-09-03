const pool = require('../config/db');

async function initPermissionsTable() {
    try {
        console.log("Creating role_permissions table...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id SERIAL PRIMARY KEY,
                role VARCHAR(50) NOT NULL UNIQUE,
                permissions JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("role_permissions table ready.");

        // Define default permission matrices
        const defaultPermissions = {
            admin: {
                members: { view: true, create: true, edit: true, delete: true },
                collections: { view: true, create: true, edit: true, verify: true, delete: true, cash_tally: true },
                expenses: { view: true, create: true, approve: true, delete: true },
                reports: { view: true, export_excel: true, print: true },
                audit: { view: true, purge: true }
            },
            pastor: {
                members: { view: true, create: true, edit: true, delete: false },
                collections: { view: true, create: true, edit: true, verify: false, delete: false, cash_tally: true },
                expenses: { view: true, create: true, approve: true, delete: false },
                reports: { view: true, export_excel: true, print: true },
                audit: { view: true, purge: false }
            },
            treasurer: {
                members: { view: true, create: false, edit: false, delete: false },
                collections: { view: true, create: true, edit: true, verify: false, delete: false, cash_tally: true },
                expenses: { view: true, create: true, approve: true, delete: true },
                reports: { view: true, export_excel: true, print: true },
                audit: { view: false, purge: false }
            },
            secretary: {
                members: { view: true, create: true, edit: true, delete: false },
                collections: { view: true, create: true, edit: true, verify: false, delete: false, cash_tally: true },
                expenses: { view: true, create: false, approve: false, delete: false },
                reports: { view: true, export_excel: true, print: true },
                audit: { view: false, purge: false }
            },
            member: {
                members: { view: false, create: false, edit: false, delete: false },
                collections: { view: false, create: false, edit: false, verify: false, delete: false, cash_tally: false },
                expenses: { view: false, create: false, approve: false, delete: false },
                reports: { view: false, export_excel: false, print: false },
                audit: { view: false, purge: false }
            }
        };

        for (const [role, perms] of Object.entries(defaultPermissions)) {
            await pool.query(`
                INSERT INTO role_permissions (role, permissions)
                VALUES ($1, $2)
                ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = CURRENT_TIMESTAMP
            `, [role.toLowerCase(), JSON.stringify(perms)]);
            console.log(`Initialized permissions for role: ${role}`);
        }

        console.log("✅ Role permissions initialization complete.");
        process.exit(0);
    } catch (e) {
        console.error("Failed to initialize role permissions:", e);
        process.exit(1);
    }
}

initPermissionsTable();
