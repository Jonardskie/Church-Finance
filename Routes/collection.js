// File: Routes/collection.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/collectionController");

// Basic Authentication Middleware
const authMiddleware = require("../middleware/authMiddleware");

// Routes
router.get("/", authMiddleware, controller.getCollections);
router.post("/", authMiddleware, controller.createCollection);
router.put("/verify/:id", authMiddleware, controller.verifyCollection);
router.delete("/:id", authMiddleware, controller.deleteCollection);

// 🔥 Corrected this line to use 'controller' instead of 'collectionController'
router.get('/member/:member_id', authMiddleware, controller.getCollectionsByMember);

module.exports = router;