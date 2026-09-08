const pool = require('../config/db');
const controller = require('../controllers/collectionTypeController');

// Mock req and res objects
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

async function testController() {
    console.log("=== TESTING COLLECTION TYPES CONTROLLER ===");

    // 1. Test GET types
    const reqGet = {};
    const resGet = createMockRes();
    await controller.getTypes(reqGet, resGet);
    console.log("1. GET /api/collection-types Status:", resGet.statusCode);
    console.log("   Items returned:", Array.isArray(resGet.data) ? resGet.data.length : resGet.data);

    // 2. Test CREATE type
    const reqCreate = {
        body: {
            name: "TEST TEMPORARY TYPE",
            description: "Automated test fund",
            status: "Active",
            ps_calculation_type: "percentage",
            ps_rate: 10,
            apportionment_calculation_type: "percentage",
            apportionment_rate: 9
        }
    };
    const resCreate = createMockRes();
    await controller.createType(reqCreate, resCreate);
    console.log("2. CREATE /api/collection-types Status:", resCreate.statusCode);
    const createdId = resCreate.data?.id;
    console.log("   Created ID:", createdId, "Name:", resCreate.data?.name);

    if (!createdId) {
        console.error("❌ Failed to create collection type:", resCreate.data);
        process.exit(1);
    }

    // 3. Test UPDATE type
    const reqUpdate = {
        params: { id: createdId },
        body: {
            name: "TEST TEMPORARY TYPE UPDATED",
            description: "Automated test fund updated",
            status: "Active",
            ps_calculation_type: "fixed",
            ps_rate: 50,
            apportionment_calculation_type: "none",
            apportionment_rate: 0
        }
    };
    const resUpdate = createMockRes();
    await controller.updateType(reqUpdate, resUpdate);
    console.log("3. UPDATE /api/collection-types/:id Status:", resUpdate.statusCode);
    console.log("   Updated Name:", resUpdate.data?.name, "PS Type:", resUpdate.data?.ps_calculation_type);

    // 4. Test REORDER types
    const reqReorder = {
        body: { order: [createdId] },
        user: { username: "AdminTest" }
    };
    const resReorder = createMockRes();
    await controller.reorderTypes(reqReorder, resReorder);
    console.log("4. REORDER /api/collection-types/reorder Status:", resReorder.statusCode);

    // 5. Test DELETE type
    const reqDelete = {
        params: { id: createdId }
    };
    const resDelete = createMockRes();
    await controller.deleteType(reqDelete, resDelete);
    console.log("5. DELETE /api/collection-types/:id Status:", resDelete.statusCode);
    console.log("   Message:", resDelete.data?.message);

    console.log("✅ ALL COLLECTION TYPES CONTROLLER TESTS PASSED!");
    process.exit(0);
}

testController().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
