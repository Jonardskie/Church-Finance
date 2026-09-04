const pool = require('../config/db');

async function migrate() {
    try {
        console.log("Starting database update for ANONYMOUS and GUEST...");

        // 1. Revert previous collections back to ANONYMOUS
        const updateCols = await pool.query(
            "UPDATE collections SET member_name = 'ANONYMOUS' WHERE LOWER(member_name) = 'guest'"
        );
        console.log(`Reverted ${updateCols.rowCount} collection record(s) back to ANONYMOUS.`);

        // 2. Revert member ID 39 or ANONYMOUS member record
        const updateMem = await pool.query(
            "UPDATE members SET official_name = 'ANONYMOUS' WHERE LOWER(official_name) = 'guest' OR id = 39"
        );
        console.log(`Updated ${updateMem.rowCount} member record(s) to ANONYMOUS.`);

        // 3. Ensure a dedicated GUEST system member exists in members table
        const guestCheck = await pool.query("SELECT id FROM members WHERE LOWER(official_name) = 'guest' OR member_id = 'GUEST'");
        if (guestCheck.rows.length === 0) {
            const insertGuest = await pool.query(`
                INSERT INTO members (member_id, official_name, status)
                VALUES ('GUEST', 'GUEST', 'Active')
                RETURNING id, member_id, official_name
            `);
            console.log("Created dedicated GUEST member:", insertGuest.rows[0]);
        } else {
            console.log("GUEST member already exists in members table.");
        }

        console.log("✅ Database update for ANONYMOUS & GUEST complete!");
        process.exit(0);
    } catch (e) {
        console.error("Migration error:", e);
        process.exit(1);
    }
}

migrate();
