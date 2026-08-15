// Routes/report.js

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/reportController");

const authMiddleware =
    require("../middleWare/authMiddleware");


// Collection Summary
router.get(
    "/collections/summary",
    authMiddleware,
    controller.collectionSummary
);


// Receipt Detail
router.get(
    "/collections/detail",
    authMiddleware,
    controller.collectionDetail
);


// Collection Method Summary
router.get(
    "/collections/methods",
    authMiddleware,
    controller.collectionMethodSummary
);


// Excel Export
router.get(
    "/collections/excel",
    authMiddleware,
    controller.exportExcel
);


module.exports = router;