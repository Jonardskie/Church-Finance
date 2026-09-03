const pool = require('../config/db');

async function checkDbSize() {
    try {
        const sizeRes = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as total_size, pg_database_size(current_database()) as size_bytes");
        const countCollections = await pool.query("SELECT COUNT(*) FROM collections");
        const countMembers = await pool.query("SELECT COUNT(*) FROM members");
        const countExpenses = await pool.query("SELECT COUNT(*) FROM expenses");

        console.log("DATABASE SIZE:", sizeRes.rows[0]);
        console.log("COLLECTIONS COUNT:", countCollections.rows[0].count);
        console.log("MEMBERS COUNT:", countMembers.rows[0].count);
        console.log("EXPENSES COUNT:", countExpenses.rows[0].count);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkDbSize();
