// File: Routes/collectionType.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/collectionTypeController");
const authMiddleware = require("../middleWare/authMiddleware");
const roleMiddleware = require("../middleWare/roleMiddleware");

// View collection types (Any authenticated user)
router.get("/", authMiddleware, controller.getTypes);

// Manage collection types (Admin, Treasurer)
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Admin", "Treasurer"),
    controller.createType
);

// Reorder collection types (Admin, Treasurer)
router.put(
    "/reorder",
    authMiddleware,
    roleMiddleware("Admin", "Treasurer"),
    controller.reorderTypes
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Admin", "Treasurer"),
    controller.updateType
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Admin", "Treasurer"),
    controller.deleteType
);

module.exports = router;