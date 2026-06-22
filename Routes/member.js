const express = require("express");
const router = express.Router();
const controller = require("../controllers/memberController");

// IMPORT MIDDLEWARES
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =========================
// CREATE SINGLE MEMBER (Allowed: Admin, Pastor, Secretary)
// =========================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Secretary"),
    controller.createMember
);

// =========================
// IMPORT MEMBERS (BULK) (Allowed: Admin, Pastor, Secretary)
// =========================
router.post(
    "/import",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Secretary"),
    controller.importMembers
);

// =========================
// GET ALL MEMBERS (Allowed: Any logged-in user)
// =========================
router.get(
    "/",
    authMiddleware,
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
    controller.updateMember
);

// =========================
// DELETE MEMBER (ONLY ADMIN & PASTOR)
// =========================
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Admin", "Pastor"),
    controller.deleteMember
);

module.exports = router;