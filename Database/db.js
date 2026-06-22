const { Pool } = require("pg");
require("dotenv").config(); // Loads your .env file automatically

// Establish a connection pool to the PostgreSQL server
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Note: If you are using a cloud database like Render, Neon, or Supabase, 
    // uncomment the line below:
     ssl: { rejectUnauthorized: false }
});

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        console.error("Database Connection Error:", err.message);
    } else {
        console.log("Connected to PostgreSQL Database");
        release(); // Release the client back to the pool
    }
});

// Async function to create tables sequentially
const initializeDatabase = async () => {
    try {
        // Updated AUTOINCREMENT to GENERATED ALWAYS AS IDENTITY
        // Updated join_date to use proper DATE type instead of TEXT
        await pool.query(`
            CREATE TABLE IF NOT EXISTS members (
                id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                member_id TEXT UNIQUE,
                official_name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                role TEXT,
                status TEXT,
                join_date DATE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS member_counters (
                id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                year INTEGER,
                month INTEGER,
                counter INTEGER,
                UNIQUE(year, month)
            );
        `);

        console.log("Database tables checked/created successfully.");
    } catch (err) {
        console.error("Error creating tables:", err.message);
    }
};

// Run the initialization
initializeDatabase();

// Export the pool so other files can run queries
module.exports = pool;