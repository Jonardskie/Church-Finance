// File: Routes/collection.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/collectionController");

// Middlewares
const authMiddleware = require("../middleWare/authMiddleware");
const roleMiddleware = require("../middleWare/roleMiddleware");

// ============================================================
// USER SIDE (MEMBER PORTAL) ROUTES - ANY AUTHENTICATED MEMBER
// ============================================================
router.get("/my-contributions", authMiddleware, controller.getMyContributions);
router.get("/my-summary", authMiddleware, controller.getMySummary);

// ============================================================
// MANAGEMENT ROUTES - PROTECTED BY RBAC
// ============================================================
// Get all collections (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.getCollections
);

// Create collection record (Admin, Pastor, Treasurer, Secretary)
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.createCollection
);

// Batch Verify Collections (Admin ONLY)
router.put(
    "/verify-batch",
    authMiddleware,
    roleMiddleware("Admin"),
    controller.verifyBatchCollections
);

// Verify collection (Admin ONLY)
router.put(
    "/verify/:id",
    authMiddleware,
    roleMiddleware("Admin"),
    controller.verifyCollection
);

// Delete collection (Admin, Pastor, Treasurer)
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.deleteCollection
);

// Update collection (Admin, Pastor, Treasurer)
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware('Admin', 'Pastor', 'Treasurer'),
    controller.updateCollection
);


// Get collections by specific member ID (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/member/:member_id",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.getCollectionsByMember
);

// Calculation configuration routes (Admin, Treasurer)
router.get(
    "/calculations/config",
    authMiddleware,
    roleMiddleware("Admin", "Treasurer"),
    controller.getCalculationConfigs
);

router.post(
    "/calculations/config",
    authMiddleware,
    roleMiddleware("Admin", "Treasurer"),
    controller.updateCalculationConfig
);

// Sunday Cash Tally Routes (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/cash-tally/summary",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.getCashTallySummary
);

router.post(
    "/cash-tally",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.saveCashTally
);

router.get(
    "/cash-tally/export-excel",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.exportCashTallyExcel
);

router.get(
    "/cash-tally/signatories",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.getSignatories
);

module.exports = router;