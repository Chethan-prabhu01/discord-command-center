require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const interactionsRoutes = require("./routes/interactions");
const logsRoutes = require("./routes/logs");
const configRoutes = require("./routes/config");
const { retryPendingMirrors } = require("./utils/mirror");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

// IMPORTANT: capture the raw request body bytes as `req.rawBody`.
// Discord's Ed25519 signature is computed over the exact raw bytes it
// sent -- if we verify against the re-serialized JSON object instead,
// verification will intermittently fail. This must run for every route
// that reads req.body, so it's global, but only /api/interactions
// actually uses req.rawBody.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/interactions", interactionsRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/config", configRoutes);

// Centralized error handler -- ensures a downstream/DB blip returns a
// clean 500 instead of crashing the process or hanging Discord's request.
app.use((err, _req, res, _next) => {
  console.error("[server] unhandled error:", err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });

  // Background sweep for mirror notifications that failed because the
  // downstream (Slack/Discord webhook) was briefly unavailable. Runs
  // every 60s and never blocks interaction handling.
  const defaultMirrorUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_MIRROR_WEBHOOK_URL;
  setInterval(() => {
    retryPendingMirrors(defaultMirrorUrl).catch((err) =>
      console.error("[mirror-retry] sweep failed:", err.message)
    );
  }, 60_000);
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
