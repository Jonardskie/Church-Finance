require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

// 1. IMPORT ROUTES (All at the top)
const authRoutes = require("./Routes/auth");
const collectionRoutes = require("./Routes/collection");
const collectionTypeRoutes = require("./Routes/collectionType");
const memberRoutes = require("./Routes/member");
const reportRoutes = require("./Routes/report");
// Change this line in your server.js
const expenseRoutes = require("./Routes/expenses"); 

// 2. INIT APP
const app = express();

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(fileUpload()); 

// 4. USE ROUTES (All after app is initialized)
app.use("/api/members", memberRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/collection-types", collectionTypeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);

// 5. STATIC FILES & ROOT REDIRECT
app.use(express.static("Dashboard"));

const path = require("path");

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Dashboard", "pages", "login.html"));
});
// DATABASE INIT
require("./config/db");

// SERVER START
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});