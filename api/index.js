require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const path = require("path");
const { rateLimit } = require("express-rate-limit");

// Create Express app
const app = express();
app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(express.json());

// Secure File Upload (10MB limit, abort on oversize)
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true
}));

// Multi-tenant routing middleware for Vercel
const tenantMiddleware = require("../middleWare/tenantMiddleware");
app.use(tenantMiddleware);

// Rate Limiters (Tenant-Isolated)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP per church to 150 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => `${req.ip}_${req.churchSlug || "default"}`,
    skip: (req) => req.originalUrl && req.originalUrl.startsWith("/api/auth")
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP per church to 20 login attempts per windowMs
    message: {
        error: "Too many login attempts from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: (req) => `${req.ip}_${req.churchSlug || "default"}`
});

// Apply limiters to API paths
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        church: req.churchSlug || "maui",
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
    const settingsRoutes = require("../Routes/settings");
    const permissionRoutes = require("../Routes/permission");

    app.use("/api/auth", authRoutes);
    app.use("/api/collections", collectionRoutes);
    app.use("/api/collection-types", collectionTypeRoutes);
    app.use("/api/members", memberRoutes);
    app.use("/api/expenses", expenseRoutes);
    app.use("/api/reports", reportRoutes);
    app.use("/api/audit", auditRoutes);
    app.use("/api/settings", settingsRoutes);
    app.use("/api/permissions", permissionRoutes);
} catch (error) {
    console.error("❌ Error loading routes:", error.message);
}

// Database init
try {
    require("../config/db");
} catch (error) {
    console.error("⚠️ Database init warning:", error.message);
}

// Static files - serve from Dashboard, Dashboard/pages, and Dashboard/downloads folders
const dashboardPath = path.join(__dirname, "../Dashboard");
const pagesPath = path.join(__dirname, "../Dashboard/pages");
const downloadsPath = path.join(__dirname, "../Dashboard/downloads");

app.use(express.static(dashboardPath));
app.use(express.static(pagesPath));
app.use("/downloads", express.static(downloadsPath));

app.get("/downloads/:file", (req, res, next) => {
    const filePath = path.join(downloadsPath, req.params.file);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

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
