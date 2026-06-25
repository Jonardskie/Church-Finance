const express = require("express");
const router = express.Router();
const controller = require("../controllers/expensesController");
const auth = require("../middleware/authMiddleware");

// These link your URL paths to your controller functions
router.get("/", auth, controller.getExpenses);
router.post("/", auth, controller.createExpense);

module.exports = router;