const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/expensesController");

const auth =
    require("../middleWare/authMiddleware");

const roleMiddleware =
    require("../middleWare/roleMiddleware");


/*
=========================================================
EXPENSE ROUTES - PROTECTED BY RBAC
=========================================================
*/


// GET ALL EXPENSES (Admin, Pastor, Treasurer)
router.get(
    "/",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.getExpenses
);


// GET ONE EXPENSE (Admin, Pastor, Treasurer)
router.get(
    "/:id",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.getExpenseById
);


// CREATE EXPENSE (Admin, Pastor, Treasurer)
router.post(
    "/",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.createExpense
);


// UPDATE EXPENSE (Admin, Pastor, Treasurer)
router.put(
    "/:id",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.updateExpense
);


// APPROVE EXPENSE (Admin, Pastor, Treasurer)
router.post(
    "/:id/approve",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.approveExpense
);


// VOID EXPENSE (Admin, Pastor, Treasurer)
router.post(
    "/:id/void",
    auth,
    roleMiddleware("Admin", "Pastor", "Treasurer"),
    controller.voidExpense
);


module.exports = router;