const http = require('http');

async function testApi() {
    const token = "mock_token"; // we can inspect backend handler directly or invoke backend query
    console.log("Testing cash tally backend queries...");
    const pool = require("../config/db");
    
    // 1. Query ledger sum
    const ledger = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM collections WHERE church_slug = 'maui' AND date >= '2026-09-01' AND date <= '2026-09-30'"
    );
    console.log("✅ September 2026 Ledger Sum:", ledger.rows[0].total);
    process.exit(0);
}

testApi();
