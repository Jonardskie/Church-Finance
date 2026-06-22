// File: Routes/collection.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/collectionController");

// Basic Authentication Middleware (Assumes you have this from your members setup)
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, controller.getCollections);
router.post("/", authMiddleware, controller.createCollection);
router.put("/verify/:id", authMiddleware, controller.verifyCollection);
router.delete("/:id", authMiddleware, controller.deleteCollection);

module.exports = router;