const pool = require("../config/db");

const ALLOWED_PAYMENT_METHODS = [
    "Cash",
    "Check",
    "Bank Transfer",
    "GCash",
    "Other"
];

const ALLOWED_STATUSES = [
    "Pending",
    "Approved",
    "Voided"
];

function clean(value) {
    if (value === undefined || value === null) return null;

    const text = String(value).trim();

    return text === "" ? null : text;
}

function getCurrentUser(req) {
    return {
        username:
            clean(req.user?.username) ||
            clean(req.user?.name) ||
            clean(req.user?.email) ||
            "Admin",

        role:
            clean(req.user?.role) ||
            ""
    };
}

function canManageExpenses(req) {
    const { role } = getCurrentUser(req);

    const allowedRoles = [
        "admin",
        "administrator",
        "treasurer",
        "finance officer",
        "finance_officer",
        "finance",
        "pastor"
    ];

    return allowedRoles.includes(role.toLowerCase());
}

function canApproveExpenses(req) {
    const { role } = getCurrentUser(req);

    const allowedRoles = [
        "admin",
        "administrator",
        "treasurer",
        "finance officer",
        "finance_officer",
        "pastor"
    ];

    return allowedRoles.includes(role.toLowerCase());
}

function auditDetails(action, expense, extra = "") {
    return [
        action,
        `Expense ID: ${expense.expense_id}`,
        `Voucher: ${expense.voucher_number}`,
        `Amount: ${expense.amount}`,
        extra
    ]
        .filter(Boolean)
        .join(" | ");
}


/*
=========================================================
GET ALL EXPENSES
=========================================================
*/

exports.getExpenses = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                expense_id,
                voucher_number,
                date,
                category,
                fund,
                amount,
                payee,
                payment_method,
                reference_number,
                description,
                notes,
                receipt_url,
                status,
                created_by,
                created_at,
                updated_at,
                approved_by,
                approved_at
            FROM expenses
            ORDER BY date DESC, expense_id DESC
        `);

        res.json(result.rows);

    } catch (err) {
        console.error("GET EXPENSES ERROR:", err);

        res.status(500).json({
            error: "Failed to load expenses."
        });
    }
};


/*
=========================================================
GET ONE EXPENSE
=========================================================
*/

exports.getExpenseById = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                expense_id,
                voucher_number,
                date,
                category,
                fund,
                amount,
                payee,
                payment_method,
                reference_number,
                description,
                notes,
                receipt_url,
                status,
                created_by,
                created_at,
                updated_at,
                approved_by,
                approved_at
            FROM expenses
            WHERE expense_id = $1
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Expense not found."
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error("GET EXPENSE ERROR:", err);

        res.status(500).json({
            error: "Failed to load expense."
        });
    }
};


/*
=========================================================
CREATE EXPENSE
=========================================================
*/

exports.createExpense = async (req, res) => {

    const {
        date,
        category,
        fund,
        amount,
        payee,
        payment_method,
        reference_number,
        description,
        notes,
        receipt_url
    } = req.body;

    const cleanDate = clean(date);
    const cleanCategory = clean(category);
    const cleanFund = clean(fund);
    const cleanPayee = clean(payee);
    const cleanPaymentMethod = clean(payment_method);
    const cleanReferenceNumber = clean(reference_number);
    const cleanDescription = clean(description);
    const cleanNotes = clean(notes);
    const cleanReceiptUrl = clean(receipt_url);

    const numericAmount = Number(amount);

    if (!cleanDate || !cleanCategory) {
        return res.status(400).json({
            error: "Expense date and category are required."
        });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            error: "Expense amount must be greater than zero."
        });
    }

    if (
        cleanPaymentMethod &&
        !ALLOWED_PAYMENT_METHODS.includes(cleanPaymentMethod)
    ) {
        return res.status(400).json({
            error: "Invalid payment method."
        });
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const expenseDate = new Date(cleanDate);

        if (Number.isNaN(expenseDate.getTime())) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Invalid expense date."
            });
        }

        const year = expenseDate.getUTCFullYear();

        const month = String(
            expenseDate.getUTCMonth() + 1
        ).padStart(2, "0");

        const prefix = `VC_${year}-${month}-`;

        /*
        Prevent two users from generating
        the same voucher sequence.
        */

        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1))",
            [prefix]
        );

        const countResult = await client.query(
            `
            SELECT COUNT(*)::int AS count
            FROM expenses
            WHERE voucher_number LIKE $1
            `,
            [`${prefix}%`]
        );

        const sequence = String(
            countResult.rows[0].count + 1
        ).padStart(4, "0");

        const voucherNumber =
            `${prefix}${sequence}`;

        const { username } = getCurrentUser(req);

        const result = await client.query(
            `
            INSERT INTO expenses (
                voucher_number,
                date,
                category,
                fund,
                amount,
                payee,
                payment_method,
                reference_number,
                description,
                notes,
                receipt_url,
                status,
                created_by
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                'Pending',
                $12
            )
            RETURNING *
            `,
            [
                voucherNumber,
                cleanDate,
                cleanCategory,
                cleanFund,
                numericAmount,
                cleanPayee,
                cleanPaymentMethod,
                cleanReferenceNumber,
                cleanDescription,
                cleanNotes,
                cleanReceiptUrl,
                username
            ]
        );

        const expense = result.rows[0];

        await client.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "CREATE_EXPENSE",
                "expenses",
                auditDetails(
                    "Created expense",
                    expense
                )
            ]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Expense recorded successfully.",
            data: expense
        });

    } catch (err) {

        await client.query("ROLLBACK");

        console.error(
            "CREATE EXPENSE ERROR:",
            err
        );

        res.status(500).json({
            error: "Failed to record expense."
        });

    } finally {
        client.release();
    }
};


/*
=========================================================
UPDATE EXPENSE
=========================================================
*/

exports.updateExpense = async (req, res) => {

    if (!canManageExpenses(req)) {
        return res.status(403).json({
            error: "You do not have permission to edit expenses."
        });
    }

    const {
        date,
        category,
        fund,
        amount,
        payee,
        payment_method,
        reference_number,
        description,
        notes,
        receipt_url
    } = req.body;

    const cleanDate = clean(date);
    const cleanCategory = clean(category);
    const cleanFund = clean(fund);
    const cleanPayee = clean(payee);
    const cleanPaymentMethod = clean(payment_method);
    const cleanReferenceNumber = clean(reference_number);
    const cleanDescription = clean(description);
    const cleanNotes = clean(notes);
    const cleanReceiptUrl = clean(receipt_url);

    const numericAmount = Number(amount);

    if (!cleanDate || !cleanCategory) {
        return res.status(400).json({
            error: "Expense date and category are required."
        });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            error: "Expense amount must be greater than zero."
        });
    }

    if (
        cleanPaymentMethod &&
        !ALLOWED_PAYMENT_METHODS.includes(cleanPaymentMethod)
    ) {
        return res.status(400).json({
            error: "Invalid payment method."
        });
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const existingResult = await client.query(
            `
            SELECT *
            FROM expenses
            WHERE expense_id = $1
            FOR UPDATE
            `,
            [req.params.id]
        );

        if (existingResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Expense not found."
            });
        }

        const existing = existingResult.rows[0];

        if (existing.status !== "Pending") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error:
                    "Only Pending expenses can be edited."
            });
        }

        const { username } = getCurrentUser(req);

        const result = await client.query(
            `
            UPDATE expenses
            SET
                date = $1,
                category = $2,
                fund = $3,
                amount = $4,
                payee = $5,
                payment_method = $6,
                reference_number = $7,
                description = $8,
                notes = $9,
                receipt_url = $10,
                updated_at = NOW()
            WHERE expense_id = $11
            RETURNING *
            `,
            [
                cleanDate,
                cleanCategory,
                cleanFund,
                numericAmount,
                cleanPayee,
                cleanPaymentMethod,
                cleanReferenceNumber,
                cleanDescription,
                cleanNotes,
                cleanReceiptUrl,
                req.params.id
            ]
        );

        const expense = result.rows[0];

        await client.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "UPDATE_EXPENSE",
                "expenses",
                auditDetails(
                    "Updated expense",
                    expense
                )
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: "Expense updated successfully.",
            data: expense
        });

    } catch (err) {

        await client.query("ROLLBACK");

        console.error(
            "UPDATE EXPENSE ERROR:",
            err
        );

        res.status(500).json({
            error: "Failed to update expense."
        });

    } finally {
        client.release();
    }
};


/*
=========================================================
APPROVE EXPENSE
=========================================================
*/

exports.approveExpense = async (req, res) => {

    if (!canApproveExpenses(req)) {
        return res.status(403).json({
            error:
                "You do not have permission to approve expenses."
        });
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const result = await client.query(
            `
            SELECT *
            FROM expenses
            WHERE expense_id = $1
            FOR UPDATE
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Expense not found."
            });
        }

        const expense = result.rows[0];

        if (expense.status !== "Pending") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error:
                    `Cannot approve an expense with status ${expense.status}.`
            });
        }

        const { username } = getCurrentUser(req);

        const updateResult = await client.query(
            `
            UPDATE expenses
            SET
                status = 'Approved',
                approved_by = $1,
                approved_at = NOW(),
                updated_at = NOW()
            WHERE expense_id = $2
            RETURNING *
            `,
            [
                username,
                req.params.id
            ]
        );

        const updatedExpense =
            updateResult.rows[0];

        await client.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "APPROVE_EXPENSE",
                "expenses",
                auditDetails(
                    "Approved expense",
                    updatedExpense,
                    `Approved by: ${username}`
                )
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: "Expense approved successfully.",
            data: updatedExpense
        });

    } catch (err) {

        await client.query("ROLLBACK");

        console.error(
            "APPROVE EXPENSE ERROR:",
            err
        );

        res.status(500).json({
            error: "Failed to approve expense."
        });

    } finally {
        client.release();
    }
};


/*
=========================================================
VOID EXPENSE
=========================================================
*/

exports.voidExpense = async (req, res) => {

    if (!canManageExpenses(req)) {
        return res.status(403).json({
            error:
                "You do not have permission to void expenses."
        });
    }

    const reason =
        clean(req.body?.reason) ||
        "No reason provided";

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const result = await client.query(
            `
            SELECT *
            FROM expenses
            WHERE expense_id = $1
            FOR UPDATE
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Expense not found."
            });
        }

        const expense = result.rows[0];

        if (expense.status === "Voided") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Expense is already voided."
            });
        }

        const { username } = getCurrentUser(req);

        const updateResult = await client.query(
            `
            UPDATE expenses
            SET
                status = 'Voided',
                notes =
                    CASE
                        WHEN notes IS NULL OR notes = ''
                        THEN $1
                        ELSE notes || E'\\n' || $1
                    END,
                updated_at = NOW()
            WHERE expense_id = $2
            RETURNING *
            `,
            [
                `VOIDED: ${reason}`,
                req.params.id
            ]
        );

        const updatedExpense =
            updateResult.rows[0];

        await client.query(
            `
            INSERT INTO audit_logs
                (user_name, action_type, table_name, details)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                username,
                "VOID_EXPENSE",
                "expenses",
                auditDetails(
                    "Voided expense",
                    updatedExpense,
                    `Reason: ${reason}`
                )
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: "Expense voided successfully.",
            data: updatedExpense
        });

    } catch (err) {

        await client.query("ROLLBACK");

        console.error(
            "VOID EXPENSE ERROR:",
            err
        );

        res.status(500).json({
            error: "Failed to void expense."
        });

    } finally {
        client.release();
    }
};