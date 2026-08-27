const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/auditController");

const auth =
    require("../middleWare/authMiddleware");

const roleMiddleware =
    require("../middleWare/roleMiddleware");


/*
=========================================================
AUDIT TRAIL ROUTES - PROTECTED BY RBAC
=========================================================
*/

// Get audit trail logs (Admin, Pastor, Treasurer)
router.get(
    "/",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.getAuditLogs
);


module.exports = router;