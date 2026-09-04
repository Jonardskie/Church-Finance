const pool = require('../config/db');

async function inspect() {
    try {
        const membersRes = await pool.query(
            "SELECT id, member_id, official_name FROM members WHERE LOWER(official_name) LIKE '%anonymous%' OR LOWER(official_name) LIKE '%guest%'"
        );
        console.log("Placeholder Members:", membersRes.rows);

        const colRes = await pool.query(
            "SELECT member_name, COUNT(*) FROM collections WHERE LOWER(member_name) LIKE '%anonymous%' OR LOWER(member_name) LIKE '%guest%' GROUP BY member_name"
        );
        console.log("Collections Grouped:", colRes.rows);

        process.exit(0);
    } catch (e) {
        console.error("Inspect error:", e);
        process.exit(1);
    }
}

inspect();
