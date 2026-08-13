require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection but don't crash if it fails on startup
pool.connect()
    .then(() => {
        console.log("✅ Connected to Neon PostgreSQL");
    })
    .catch((err) => {
        console.warn("⚠️ Database connection warning:", err.message);
        console.warn("⚠️ Ensure DATABASE_URL is set in environment variables");
    });

module.exports = pool;