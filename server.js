require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

// 1. IMPORT ROUTES (These are just definitions, they don't run yet)
const authRoutes = require("./Routes/auth");
const collectionRoutes = require("./Routes/collection");
const collectionTypeRoutes = require("./Routes/collectionType");
const memberRoutes = require("./Routes/member");

// 2. INIT APP (This must come before you use app.use)
const app = express();

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(fileUpload()); 

// 4. USE ROUTES (Now 'app' exists, so this is safe)
app.use("/api/members", memberRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/collection-types", collectionTypeRoutes);

// 🔥 SECURITY: Force root traffic straight to login
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// STATIC FILES
app.use(express.static("Dashboard"));

// DATABASE INIT
require("./Database/db");

// SERVER START
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});