const pool = require("../Database/db");

// 1. GET ALL EXPENSES
exports.getExpenses = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM expenses ORDER BY voucher_number DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createExpense = async (req, res) => {
    const { date, category, amount, description } = req.body;
    
    try {
        // 1. Get current Year and Month
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `VC_${year}-${month}-`;

        // 2. Count existing vouchers for this month to get the next number
        // We look for any voucher starting with 'VC_2026-06-'
        const countQuery = await pool.query(
            "SELECT COUNT(*) FROM expenses WHERE voucher_number LIKE $1",
            [`${prefix}%`]
        );
        
        const count = parseInt(countQuery.rows[0].count) + 1;
        const sequence = String(count).padStart(4, '0'); // Turns '1' into '0001'
        const fullVoucherNumber = `${prefix}${sequence}`;

        // 3. Save the record
        const result = await pool.query(
            "INSERT INTO expenses (voucher_number, date, category, amount, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [fullVoucherNumber, date, category, amount, description]
        );

        // 4. Audit Log
        await pool.query(
            "INSERT INTO audit_logs (user_name, action_type, table_name, details) VALUES ($1, $2, $3, $4)",
            [req.user?.username || 'Admin', 'CREATE_EXPENSE', 'expenses', `Generated ${fullVoucherNumber}`]
        );

        res.json({ message: "Expense recorded", data: result.rows[0] });
    } catch (err) {
        console.error("❌ EXPENSE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};