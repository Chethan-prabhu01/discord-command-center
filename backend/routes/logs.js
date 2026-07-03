const express = require("express");
const requireAuth = require("../middleware/auth");
const { listLogs, logStats } = require("../controllers/logController");

const router = express.Router();

router.get("/", requireAuth, listLogs);
router.get("/stats", requireAuth, logStats);

module.exports = router;
