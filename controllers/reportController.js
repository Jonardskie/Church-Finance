const pool = require("../Database/db");

exports.getFinancialReport = async (req, res) => {
    const { start, end } = req.query;

    try {
        // 1. Get Inflow (Collections)
        const collections = await pool.query(
            "SELECT fund_category as category, SUM(amount) as total FROM collections WHERE date >= $1 AND date <= $2 GROUP BY fund_category",
            [start, end]
        );

        // 2. Get Outflow (Expenses)
        const expenses = await pool.query(
            "SELECT category, SUM(amount) as total FROM expenses WHERE date >= $1 AND date <= $2 GROUP BY category",
            [start, end]
        );

        // 3. Get Audit Logs
        const logs = await pool.query(
            "SELECT details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10"
        );

        res.json({
            collections: collections.rows,
            expenses: expenses.rows,
            logs: logs.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};