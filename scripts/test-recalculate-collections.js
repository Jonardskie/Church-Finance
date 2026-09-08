const pool = require('../config/db');

async function testRecalculation() {
    console.log("=== TESTING DYNAMIC RECALCULATION ON PERCENTAGE CHANGE ===");

    // Find TITHES in collection_types
    const typeRes = await pool.query("SELECT * FROM collection_types WHERE UPPER(name) = 'TITHES' LIMIT 1");
    if (!typeRes.rows.length) {
        console.error("TITHES not found");
        process.exit(1);
    }

    const tithesType = typeRes.rows[0];
    console.log("Current TITHES config:", {
        id: tithesType.id,
        name: tithesType.name,
        ps_rate: tithesType.ps_rate,
        apportionment_rate: tithesType.apportionment_rate
    });

    // Check current collections count and sum for TITHES
    const colRes = await pool.query("SELECT COUNT(*)::int as count, SUM(amount)::numeric as total_amount, SUM(ps_amount)::numeric as total_ps, SUM(apportionment_amount)::numeric as total_apportionment FROM collections WHERE UPPER(type) = 'TITHES'");
    console.log("Current TITHES Collections Summary:", colRes.rows[0]);

    console.log("✅ Query test complete!");
    process.exit(0);
}

testRecalculation().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
