const pool = require('../config/db');

async function migrate() {
    try {
        console.log("Starting database migration: ANONYMOUS -> GUEST...");

        const updateMembers = await pool.query(
            "UPDATE members SET official_name = 'GUEST' WHERE LOWER(official_name) = 'anonymous'"
        );
        console.log(`Updated ${updateMembers.rowCount} member record(s) to GUEST.`);

        const updateCollections = await pool.query(
            "UPDATE collections SET member_name = 'GUEST' WHERE LOWER(member_name) = 'anonymous'"
        );
        console.log(`Updated ${updateCollections.rowCount} collection record(s) to GUEST.`);

        console.log("✅ Database migration completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Migration error:", e);
        process.exit(1);
    }
}

migrate();
