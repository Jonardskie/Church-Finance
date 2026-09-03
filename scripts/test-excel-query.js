const pool = require('../config/db');

async function testQuery() {
    try {
        const colRes = await pool.query(
            `SELECT c.receipt_no, c.date, c.member_name AS giver_name, COALESCE(ct.name, c.type, c.fund_category, 'General Fund') AS category, c.payment_method, c.amount, c.status
             FROM collections c
             LEFT JOIN collection_types ct ON c.collection_type_id = ct.id
             WHERE c.date >= '2026-01-01' AND c.date <= '2026-12-31' AND LOWER(c.status) != 'voided'
             ORDER BY c.date DESC, c.id DESC`
        );
        console.log("✅ SQL Query Succeeded! Returned rows:", colRes.rows.length);
        process.exit(0);
    } catch (e) {
        console.error("❌ SQL Query Error:", e);
        process.exit(1);
    }
}

testQuery();
