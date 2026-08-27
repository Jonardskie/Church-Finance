require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const path = require("path");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Health check endpoint
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

// Import routes with error handling
try {
    const authRoutes = require("../Routes/auth");
    const collectionRoutes = require("../Routes/collection");
    const collectionTypeRoutes = require("../Routes/collectionType");
    const memberRoutes = require("../Routes/member");
    const reportRoutes = require("../Routes/report");
    const expenseRoutes = require("../Routes/expenses");
    const auditRoutes = require("../Routes/audit");

    app.use("/api/auth", authRoutes);
    app.use("/api/collections", collectionRoutes);
    app.use("/api/collection-types", collectionTypeRoutes);
    app.use("/api/members", memberRoutes);
    app.use("/api/expenses", expenseRoutes);
    app.use("/api/reports", reportRoutes);
    app.use("/api/audit", auditRoutes);
} catch (error) {
    console.error("❌ Error loading routes:", error.message);
}

// Database init
try {
    require("../config/db");
} catch (error) {
    console.error("⚠️ Database init warning:", error.message);
}

// Static files - serve from Dashboard and Dashboard/pages folders
const dashboardPath = path.join(__dirname, "../Dashboard");
const pagesPath = path.join(__dirname, "../Dashboard/pages");
app.use(express.static(dashboardPath));
app.use(express.static(pagesPath));

// Root route - serve login.html
app.get("/", (req, res) => {
    res.sendFile(path.join(pagesPath, "login.html"));
});

// Explicit /pages/:page routing
app.get("/pages/:page", (req, res, next) => {
    const pageName = req.params.page.endsWith(".html") ? req.params.page : `${req.params.page}.html`;
    const filePath = path.join(pagesPath, pageName);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

// Direct root /:page routing (e.g. /index.html, /members.html)
app.get("/:page", (req, res, next) => {
    if (req.params.page.startsWith("api")) return next();
    const pageName = req.params.page.endsWith(".html") ? req.params.page : `${req.params.page}.html`;
    const filePath = path.join(pagesPath, pageName);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || "Internal Server Error"
    });
});

module.exports = app;
