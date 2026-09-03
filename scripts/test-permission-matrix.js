const pool = require('../config/db');
const permissionController = require('../controllers/permissionController');

async function testPermissionMatrix() {
    try {
        console.log("Testing Permission Matrix...");

        // 1. Get permissions map
        const map = await permissionController.getPermissionsMap();
        console.log("Roles in permissions map:", Object.keys(map));

        if (!map.pastor || !map.treasurer || !map.secretary) {
            throw new Error("Missing expected roles in permission matrix!");
        }

        // 2. Test Admin Updating Matrix (Disable Pastor delete permission on members)
        const reqUpdate = {
            body: {
                matrix: {
                    pastor: {
                        members: { view: true, create: true, edit: true, delete: false },
                        collections: { view: true, create: true, edit: true, verify: false, delete: false, cash_tally: true },
                        expenses: { view: true, create: true, approve: true, delete: false },
                        reports: { view: true, export_excel: true, print: true },
                        audit: { view: true, purge: false }
                    }
                }
            }
        };

        let resStatus = 0;
        let resBody = null;

        const resObj = {
            status: (code) => {
                resStatus = code;
                return { json: (b) => { resBody = b; } };
            },
            json: (b) => { resStatus = 200; resBody = b; }
        };

        await permissionController.updatePermissions(reqUpdate, resObj);
        console.log("Update Matrix Status:", resStatus, resBody);

        if (resStatus !== 200) {
            throw new Error("Failed to update permission matrix.");
        }

        // 3. Test permissionMiddleware for Pastor deleting member (should be blocked with 403)
        const permissionMiddleware = require('../middleWare/permissionMiddleware');

        const mockReqPastorDelete = {
            user: { id: 88, role: 'Pastor', church_slug: 'default' }
        };

        let middlewarePassed = false;
        let middlewareErrorStatus = 0;
        let middlewareErrorBody = null;

        const mockRes = {
            status: (code) => {
                middlewareErrorStatus = code;
                return { json: (b) => { middlewareErrorBody = b; } };
            }
        };

        const next = () => { middlewarePassed = true; };

        const checkMemberDelete = permissionMiddleware("members", "delete");
        await checkMemberDelete(mockReqPastorDelete, mockRes, next);

        console.log("Pastor Delete Member Permission Check Passed?", middlewarePassed);
        console.log("Middleware Error Output:", middlewareErrorStatus, middlewareErrorBody);

        if (middlewarePassed) {
            throw new Error("Pastor should NOT be allowed to delete members when permission is set to false!");
        }

        if (middlewareErrorStatus !== 403) {
            throw new Error("Expected HTTP 403 Forbidden for restricted permission!");
        }

        console.log("✅ ALL PERMISSION MATRIX TESTS PASSED SUCCESSFULLY!");
        process.exit(0);

    } catch (e) {
        console.error("Test Error:", e);
        process.exit(1);
    }
}

testPermissionMatrix();
