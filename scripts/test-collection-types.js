const pool = require('../config/db');

async function testCollectionTypes() {
    try {
        console.log("Testing collection_types database table...");
        const res = await pool.query(`
            SELECT
                id,
                name,
                description,
                status,
                ps_calculation_type,
                ps_rate,
                apportionment_calculation_type,
                apportionment_rate,
                COALESCE(display_order, id) AS display_order
            FROM collection_types
            ORDER BY COALESCE(display_order, id) ASC, id ASC
        `);
        console.log("✅ collection_types query successful!");
        console.log(`Total Types Count: ${res.rows.length}`);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error("❌ collection_types DB Error:", err);
        process.exit(1);
    }
}

testCollectionTypes();
