const express = require("express");
const router = express.Router();
const controller = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");

// Ensure this matches the endpoint: /api/reports/dashboard-data
router.get("/dashboard-data", authMiddleware, controller.getFinancialReport);

module.exports = router;