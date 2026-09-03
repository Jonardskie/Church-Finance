const pool = require('../config/db');
const controller = require('../controllers/collectionController');

async function testSecretaryUpdate() {
    try {
        // 1. Insert a pending test collection directly
        const insertRes = await pool.query(
            `INSERT INTO collections (date, collection_date, member_id, member_name, type, amount, status, payment_method, fund_category)
             VALUES ('2026-09-03', '2026-09-03', 3, 'RODEL ACDAL', 'Tithe', 100, 'pending', 'CASH', 'General Fund')
             RETURNING id`
        );
        const collectionId = insertRes.rows[0].id;
        console.log("Created Test Collection ID:", collectionId);

        // 2. Test Secretary update on pending collection
        let resCode = 0;
        let resBody = null;

        const reqPending = {
            params: { id: collectionId },
            body: {
                date: '2026-09-03',
                member_id: 3,
                member_name: 'RODEL ACDAL',
                type: 'Tithe',
                fund: 'General Fund',
                amount: 250,
                status: 'pending',
                payment_method: 'CASH'
            },
            user: { id: 999, role: 'Secretary', church_slug: 'default' }
        };

        const resPending = {
            status: (code) => {
                resCode = code;
                return { json: (body) => { resBody = body; } };
            },
            json: (body) => { resCode = 200; resBody = body; }
        };

        await controller.updateCollection(reqPending, resPending);
        console.log("Secretary Update Pending Status:", resCode, resBody ? resBody.message : 'OK');

        if (resCode !== 200) {
            throw new Error("Secretary should be allowed to update pending collection!");
        }

        // 3. Mark collection as verified
        await pool.query("UPDATE collections SET status = 'verified' WHERE id = $1", [collectionId]);

        // 4. Test Secretary update on verified collection
        const reqVerified = {
            params: { id: collectionId },
            body: {
                date: '2026-09-03',
                member_id: 3,
                member_name: 'RODEL ACDAL',
                type: 'Tithe',
                fund: 'General Fund',
                amount: 300,
                status: 'verified',
                payment_method: 'CASH'
            },
            user: { id: 999, role: 'Secretary', church_slug: 'default' }
        };

        const resVerified = {
            status: (code) => {
                resCode = code;
                return { json: (body) => { resBody = body; } };
            },
            json: (body) => { resCode = 200; resBody = body; }
        };

        await controller.updateCollection(reqVerified, resVerified);
        console.log("Secretary Update Verified Status (Should be Locked 403):", resCode, resBody ? resBody.error : 'OK');

        if (resCode !== 403) {
            throw new Error("Secretary should NOT be allowed to update verified collection!");
        }

        // Clean up
        await pool.query("DELETE FROM collections WHERE id = $1", [collectionId]);
        console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");

        process.exit(0);
    } catch (e) {
        console.error("Test error:", e);
        process.exit(1);
    }
}

testSecretaryUpdate();
