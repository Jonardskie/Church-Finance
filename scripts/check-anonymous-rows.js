const pool = require('../config/db');

async function checkAnonymous() {
    try {
        const collectionsNameRes = await pool.query("SELECT COUNT(*) FROM collections WHERE LOWER(member_name) LIKE '%anonymous%' OR LOWER(member_id) LIKE '%anonymous%'");
        const membersRes = await pool.query("SELECT COUNT(*) FROM members WHERE LOWER(official_name) LIKE '%anonymous%' OR LOWER(member_id) LIKE '%anonymous%'");

        console.log("Collections matching 'anonymous':", collectionsNameRes.rows[0].count);
        console.log("Members matching 'anonymous':", membersRes.rows[0].count);

        // Check sample rows if any
        const sampleColls = await pool.query("SELECT id, member_id, member_name FROM collections WHERE LOWER(member_name) LIKE '%anonymous%' OR LOWER(member_id) LIKE '%anonymous%' LIMIT 10");
        console.log("Sample Collections:", sampleColls.rows);

        const sampleMembers = await pool.query("SELECT id, member_id, official_name FROM members WHERE LOWER(official_name) LIKE '%anonymous%' OR LOWER(member_id) LIKE '%anonymous%' LIMIT 10");
        console.log("Sample Members:", sampleMembers.rows);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkAnonymous();
