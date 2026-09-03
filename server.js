require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const path = require("path");
const { rateLimit } = require("express-rate-limit");
const tenantMiddleware = require("./middleWare/tenantMiddleware");

// ============================================================
// ERROR HANDLING
// ============================================================

process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});


// ============================================================
// IMPORT ROUTES
// ============================================================

let authRoutes;
let collectionRoutes;
let collectionTypeRoutes;
let memberRoutes;
let reportRoutes;
let expenseRoutes;
let auditRoutes;

try {

    authRoutes = require("./Routes/auth");

    collectionRoutes =
        require("./Routes/collection");

    collectionTypeRoutes =
        require("./Routes/collectionType");

    memberRoutes =
        require("./Routes/member");

    reportRoutes =
        require("./Routes/report");

    expenseRoutes =
        require("./Routes/expenses");

    auditRoutes =
        require("./Routes/audit");

    settingsRoutes =
        require("./Routes/settings");

    console.log("✅ All routes loaded successfully");

} catch (error) {

    console.error(
        "❌ Error loading routes:",
        error.message
    );

    process.exit(1);
}


// ============================================================
// INIT APP
// ============================================================

const app = express();
app.set("trust proxy", 1);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// Secure File Upload (10MB limit, abort on oversize)
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true
}));

// Multi-Tenant Dynamic Database Routing Middleware
app.use(tenantMiddleware);

// ============================================================
// RATE LIMITING (Tenant-Isolated)
// ============================================================

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

// ============================================================
// HEALTH CHECK
// ============================================================

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


// ============================================================
// API ROUTES
// ============================================================

if (authRoutes) {

    app.use(
        "/api/auth",
        authRoutes
    );

}

if (collectionRoutes) {

    app.use(
        "/api/collections",
        collectionRoutes
    );

}

if (collectionTypeRoutes) {

    app.use(
        "/api/collection-types",
        collectionTypeRoutes
    );

}

if (memberRoutes) {

    app.use(
        "/api/members",
        memberRoutes
    );

}

if (expenseRoutes) {

    app.use(
        "/api/expenses",
        expenseRoutes
    );

}

if (reportRoutes) {

    app.use(
        "/api/reports",
        reportRoutes
    );

}


// ============================================================
// AUDIT TRAIL ROUTE
// ============================================================

if (auditRoutes) {

    app.use(
        "/api/audit",
        auditRoutes
    );

}

if (settingsRoutes) {

    app.use(
        "/api/settings",
        settingsRoutes
    );

}


// ============================================================
// STATIC FILES & PAGE ROUTING
// ============================================================

const dashboardPath = path.join(__dirname, "Dashboard");
const pagesPath = path.join(__dirname, "Dashboard", "pages");
const downloadsPath = path.join(__dirname, "Dashboard", "downloads");

app.use(express.static(dashboardPath));
app.use(express.static(pagesPath));
app.use("/downloads", express.static(downloadsPath));

app.get("/downloads/:file", (req, res, next) => {
    const filePath = path.join(downloadsPath, req.params.file);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

// Root redirect to login
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


// ============================================================
// DATABASE INITIALIZATION
// ============================================================

try {

    require("./config/db");

    console.log(
        "✅ Database initialized"
    );

} catch (error) {

    console.error(
        "⚠️ Database initialization warning:",
        error.message
    );

}


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Error:",
            err
        );

        res.status(
            err.status || 500
        ).json({

            error: true,

            message:
                err.message ||
                "Internal Server Error",

            timestamp:
                new Date().toISOString()

        });

    }
);


// ============================================================
// SERVER START
// ============================================================

const PORT =
    process.env.PORT || 3000;


// Export for Vercel
module.exports = app;


// Local development
app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});