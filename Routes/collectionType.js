// File: Routes/collectionType.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/collectionTypeController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, controller.getTypes);
router.post("/", authMiddleware, controller.createType);
router.put("/:id", authMiddleware, controller.updateType);
router.delete("/:id", authMiddleware, controller.deleteType);

module.exports = router;