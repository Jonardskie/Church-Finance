// Routes/settings.js

const express = require("express");
const router = express.Router();
const controller = require("../controllers/settingsController");
const authMiddleware = require("../middleWare/authMiddleware");
const roleMiddleware = require("../middleWare/roleMiddleware");

// GET church settings (Public / Authenticated)
router.get("/church", controller.getChurchSettings);

// UPDATE church settings (Admin Only)
router.put(
    "/church",
    authMiddleware,
    roleMiddleware("Admin"),
    controller.updateChurchSettings
);

module.exports = router;
