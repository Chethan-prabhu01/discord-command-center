const express = require("express");
const requireAuth = require("../middleware/auth");
const { listConfigs, getConfig, upsertConfig } = require("../controllers/configController");

const router = express.Router();

router.get("/", requireAuth, listConfigs);
router.get("/:guildId", requireAuth, getConfig);
router.put("/", requireAuth, upsertConfig);

module.exports = router;
