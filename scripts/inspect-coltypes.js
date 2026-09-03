const pool = require('../config/db');

async function inspect() {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'collection_types'");
    console.log("COLLECTION_TYPES COLS:", res.rows.map(r => r.column_name));
    process.exit(0);
}

inspect();
