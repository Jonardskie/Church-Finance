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

// Verify collection (Admin, Pastor, Treasurer)
router.put(
    "/verify/:id",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
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

module.exports = router;