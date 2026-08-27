// Routes/report.js

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/reportController");

const authMiddleware =
    require("../middleWare/authMiddleware");

const roleMiddleware =
    require("../middleWare/roleMiddleware");


// Collection Summary (Admin, Pastor, Treasurer)
router.get(
    "/collections/summary",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.collectionSummary
);


// Receipt Detail (Admin, Pastor, Treasurer)
router.get(
    "/collections/detail",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.collectionDetail
);


// Collection Method Summary (Admin, Pastor, Treasurer)
router.get(
    "/collections/methods",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.collectionMethodSummary
);


// Excel Export (Admin, Pastor, Treasurer)
router.get(
    "/collections/excel",
    authMiddleware,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.exportExcel
);


module.exports = router;