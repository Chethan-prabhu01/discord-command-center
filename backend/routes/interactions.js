const express = require("express");
const verifyDiscordRequest = require("../middleware/verifyDiscordRequest");
const { handleInteraction } = require("../controllers/interactionController");

const router = express.Router();

// Every request here is verified against Discord's Ed25519 signature
// BEFORE any command logic runs -- forged/replayed requests never reach
// handleInteraction.
router.post("/", verifyDiscordRequest, handleInteraction);

module.exports = router;
