const pool = require('../config/db');

async function inspect() {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log("USERS COLUMNS:", res.rows.map(r => r.column_name));
    process.exit(0);
}

inspect();
