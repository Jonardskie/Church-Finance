const express = require("express");
const router = express.Router();
const controller = require("../controllers/permissionController");
const authMiddleware = require("../middleWare/authMiddleware");
const roleMiddleware = require("../middleWare/roleMiddleware");

// Get permissions for current authenticated user
router.get("/me", authMiddleware, controller.getMyPermissions);

// Admin: Get permissions matrix for all roles
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Admin"),
    controller.getAllPermissions
);

// Admin: Update permissions matrix
router.put(
    "/",
    authMiddleware,
    roleMiddleware("Admin"),
    controller.updatePermissions
);

module.exports = router;
