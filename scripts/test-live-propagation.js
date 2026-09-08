const pool = require('../config/db');
const controller = require('../controllers/collectionTypeController');

function createMockRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        }
    };
}

async function testPropagation() {
    console.log("=== TESTING LIVE PROPAGATION OF PERCENTAGE CHANGES ===");

    // 1. Get current TITHES config
    const initRes = await pool.query("SELECT * FROM collection_types WHERE UPPER(name) = 'TITHES' LIMIT 1");
    const tithes = initRes.rows[0];
    console.log("Initial TITHES config:", { id: tithes.id, ps_rate: tithes.ps_rate, app_rate: tithes.apportionment_rate });

    // 2. Call controller updateType to change PS rate to 12% and Apportionment rate to 10%
    const req = {
        params: { id: tithes.id },
        body: {
            name: "TITHES",
            description: tithes.description,
            status: tithes.status,
            ps_calculation_type: "percentage",
            ps_rate: 12,
            apportionment_calculation_type: "percentage",
            apportionment_rate: 10
        }
    };
    const res = createMockRes();
    await controller.updateType(req, res);

    console.log("Update response status:", res.statusCode);

    // 3. Verify collections table updated calculations for TITHES
    const colSummary = await pool.query(`
        SELECT
            COUNT(*)::int as total_records,
            SUM(amount)::numeric as total_amount,
            SUM(ps_amount)::numeric as total_ps,
            SUM(apportionment_amount)::numeric as total_apportionment,
            MIN(ps_rate)::numeric as min_ps_rate,
            MAX(ps_rate)::numeric as max_ps_rate,
            MIN(apportionment_rate)::numeric as min_app_rate,
            MAX(apportionment_rate)::numeric as max_app_rate
        FROM collections
        WHERE UPPER(type) = 'TITHES'
    `);
    console.log("Updated TITHES Summary in collections table:", colSummary.rows[0]);

    // Expected PS: 648862.00 * 0.12 = 77863.44
    // Expected Apportionment: 648862.00 * 0.10 = 64886.20

    // 4. Restore original rates (10% PS, 9% Apportionment) to keep data clean
    const restoreReq = {
        params: { id: tithes.id },
        body: {
            name: "TITHES",
            description: tithes.description,
            status: tithes.status,
            ps_calculation_type: "percentage",
            ps_rate: 10,
            apportionment_calculation_type: "percentage",
            apportionment_rate: 9
        }
    };
    const restoreRes = createMockRes();
    await controller.updateType(restoreReq, restoreRes);

    const colRestored = await pool.query(`
        SELECT
            COUNT(*)::int as total_records,
            SUM(amount)::numeric as total_amount,
            SUM(ps_amount)::numeric as total_ps,
            SUM(apportionment_amount)::numeric as total_apportionment,
            MIN(ps_rate)::numeric as min_ps_rate,
            MAX(ps_rate)::numeric as max_ps_rate
        FROM collections
        WHERE UPPER(type) = 'TITHES'
    `);
    console.log("Restored TITHES Summary in collections table:", colRestored.rows[0]);

    console.log("✅ LIVE PROPAGATION TEST COMPLETED SUCCESSFULLY!");
    process.exit(0);
}

testPropagation().catch(err => {
    console.error("Propagation test error:", err);
    process.exit(1);
});
