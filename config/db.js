require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (err) => {
    console.warn("⚠️ PostgreSQL pool connection reset:", err.code || err.message);
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