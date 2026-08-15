const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/expensesController");

const auth =
    require("../middleWare/authMiddleware");


/*
=========================================================
EXPENSE ROUTES
=========================================================
*/


// GET ALL EXPENSES
router.get(
    "/",
    auth,
    controller.getExpenses
);


// GET ONE EXPENSE
router.get(
    "/:id",
    auth,
    controller.getExpenseById
);


// CREATE EXPENSE
router.post(
    "/",
    auth,
    controller.createExpense
);


// UPDATE EXPENSE
router.put(
    "/:id",
    auth,
    controller.updateExpense
);


// APPROVE EXPENSE
router.post(
    "/:id/approve",
    auth,
    controller.approveExpense
);


// VOID EXPENSE
router.post(
    "/:id/void",
    auth,
    controller.voidExpense
);


module.exports = router;