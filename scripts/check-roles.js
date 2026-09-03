const pool = require('../config/db');

async function checkRoles() {
    try {
        const userRoles = await pool.query("SELECT DISTINCT role FROM users");
        const memberRoles = await pool.query("SELECT DISTINCT role FROM members");

        console.log("USERS DISTINCT ROLES:", userRoles.rows.map(r => r.role));
        console.log("MEMBERS DISTINCT ROLES:", memberRoles.rows.map(r => r.role));

        // Sample member records
        const sampleMembers = await pool.query("SELECT id, official_name, role FROM members LIMIT 15");
        console.log("SAMPLE MEMBERS:", sampleMembers.rows);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkRoles();
