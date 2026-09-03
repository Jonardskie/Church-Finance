const pool = require('../config/db');

async function createCashTallyTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sunday_cash_counts (
                id SERIAL PRIMARY KEY,
                church_slug VARCHAR(50) NOT NULL DEFAULT 'maui',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                service_name VARCHAR(100) DEFAULT 'Sunday Worship Service',
                bills_1000 INT DEFAULT 0,
                bills_500 INT DEFAULT 0,
                bills_200 INT DEFAULT 0,
                bills_100 INT DEFAULT 0,
                bills_50 INT DEFAULT 0,
                bills_20 INT DEFAULT 0,
                coins_20 INT DEFAULT 0,
                coins_10 INT DEFAULT 0,
                coins_5 INT DEFAULT 0,
                coins_1 INT DEFAULT 0,
                coins_loose NUMERIC(12,2) DEFAULT 0.00,
                checks_total NUMERIC(12,2) DEFAULT 0.00,
                online_total NUMERIC(12,2) DEFAULT 0.00,
                total_physical_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                total_ledger_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                variance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(30) NOT NULL DEFAULT 'TALLY_MATCH',
                variance_note TEXT,
                counter_name VARCHAR(100),
                secretary_name VARCHAR(100),
                treasurer_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'sunday_cash_counts' verified/created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating table sunday_cash_counts:", err);
        process.exit(1);
    }
}

createCashTallyTable();
