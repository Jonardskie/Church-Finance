require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

// Add error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

// 1. IMPORT ROUTES (All at the top)
let authRoutes, collectionRoutes, collectionTypeRoutes, memberRoutes, reportRoutes, expenseRoutes;

try {
    authRoutes = require("./Routes/auth");
    collectionRoutes = require("./Routes/collection");
    collectionTypeRoutes = require("./Routes/collectionType");
    memberRoutes = require("./Routes/member");
    reportRoutes = require("./Routes/report");
    expenseRoutes = require("./Routes/expenses");
    console.log("✅ All routes loaded successfully");
} catch (error) {
    console.error("❌ Error loading routes:", error.message);
    process.exit(1);
} 

// 2. INIT APP
const app = express();

// Health check endpoint (no auth required)
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        env: {
            databaseConnected: process.env.DATABASE_URL ? "✓ Set" : "✗ Missing",
            jwtSecret: process.env.JWT_SECRET ? "✓ Set" : "✗ Missing",
            nodeEnv: process.env.NODE_ENV || "production"
        }
    });
});

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(fileUpload()); 

// 4. USE ROUTES (All after app is initialized)
if (authRoutes) app.use("/api/auth", authRoutes);
if (collectionRoutes) app.use("/api/collections", collectionRoutes);
if (collectionTypeRoutes) app.use("/api/collection-types", collectionTypeRoutes);
if (memberRoutes) app.use("/api/members", memberRoutes);
if (expenseRoutes) app.use("/api/expenses", expenseRoutes);
if (reportRoutes) app.use("/api/reports", reportRoutes);

// 5. STATIC FILES & ROOT REDIRECT
app.use(express.static("Dashboard"));

const path = require("path");

app.get("/", (req, res) => {
    try {
        res.sendFile(path.join(__dirname, "Dashboard", "pages", "login.html"));
    } catch (error) {
        console.error("❌ Error serving login page:", error);
        res.status(500).send("Login page not found");
    }
});

// DATABASE INIT
try {
    require("./config/db");
    console.log("✅ Database initialized");
} catch (error) {
    console.error("⚠️ Database initialization warning:", error.message);
}

// Global error handler
app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || "Internal Server Error",
        timestamp: new Date().toISOString()
    });
});

// SERVER START
const PORT = process.env.PORT || 3000;

// Export for Vercel serverless
module.exports = app;

// Only listen locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}