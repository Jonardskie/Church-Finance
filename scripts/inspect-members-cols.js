const pool = require('../config/db');

async function inspect() {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'members'");
    console.log("MEMBERS COLUMNS:", res.rows.map(r => r.column_name));
    process.exit(0);
}

inspect();
