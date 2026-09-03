const express = require("express");
const router = express.Router();
const controller = require("../controllers/memberController");

// IMPORT MIDDLEWARES
const authMiddleware = require("../middleWare/authMiddleware");
const roleMiddleware = require("../middleWare/roleMiddleware");
const permissionMiddleware = require("../middleWare/permissionMiddleware");

// =========================
// CREATE SINGLE MEMBER (Allowed: Admin, Pastor, Secretary)
// =========================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Secretary"),
    permissionMiddleware("members", "create"),
    controller.createMember
);

// =========================
// IMPORT MEMBERS (BULK) (Allowed: Admin, Pastor, Secretary)
// =========================
router.post(
    "/import",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Secretary"),
    permissionMiddleware("members", "create"),
    controller.importMembers
);

// =========================
// GET ALL MEMBERS (Allowed: Any logged-in user)
// =========================
router.get(
    "/",
    authMiddleware,
    permissionMiddleware("members", "view"),
    controller.getMembers
);

// =========================
// GET SINGLE MEMBER
// =========================
router.get(
    "/:id",
    authMiddleware,
    controller.getMemberById
);

// =========================
// UPDATE MEMBER (Allowed: Admin, Pastor, Treasurer, Secretary)
// =========================
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    permissionMiddleware("members", "edit"),
    controller.updateMember
);


// =========================
// BATCH DELETE MEMBERS
// Allowed: Admin & Pastor
// =========================
router.delete(
    "/batch",
    authMiddleware,
    roleMiddleware("Admin", "Pastor"),
    permissionMiddleware("members", "delete"),
    controller.deleteMembersBatch
);


// =========================
// DELETE SINGLE MEMBER
// Allowed: Admin & Pastor
// =========================
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Admin", "Pastor"),
    permissionMiddleware("members", "delete"),
    controller.deleteMember
);

// =========================
// RESET MEMBER PASSWORD
// =========================
router.post(
    "/:id/reset-password",
    authMiddleware,
    roleMiddleware("Admin"),
    controller.resetMemberPassword
);

module.exports = router;