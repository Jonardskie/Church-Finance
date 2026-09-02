// Routes/report.js

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/reportController");

const authMiddleware =
    require("../middleWare/authMiddleware");

const roleMiddleware =
    require("../middleWare/roleMiddleware");


// Collection Summary (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/collections/summary",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.collectionSummary
);


// Receipt Detail (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/collections/detail",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.collectionDetail
);


// Collection Method Summary (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/collections/methods",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.collectionMethodSummary
);


// Excel Export (Admin, Pastor, Treasurer, Secretary)
router.get(
    "/collections/excel",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer", "Secretary"),
    controller.exportExcel
);


// Dashboard Summary Metrics & Analytics (All authenticated system users)
router.get(
    "/dashboard-summary",
    authMiddleware,
    controller.getDashboardSummary
);


module.exports = router;