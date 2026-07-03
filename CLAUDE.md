# CLAUDE.md

Context for AI coding assistants working in this repo.

## What this project is
A full-stack web app + Discord bot: React (Vite) frontend, Express backend,
MongoDB (Mongoose) database. Handles Discord slash-command interactions,
logs them, responds in Discord, mirrors to Slack/Discord, and exposes an
admin dashboard.

## Non-negotiable behaviors (do not "simplify" these away)
- **Every** `/api/interactions` request must pass Ed25519 signature
  verification (`middleware/verifyDiscordRequest.js`) using the raw request
  body bytes (`req.rawBody`, captured in `server.js`'s `express.json({verify})`
  hook) — never verify against a re-serialized `req.body`.
- Every interaction must be deduplicated on Discord's `interaction.id` via
  the unique index on `Log.interactionId`. Never remove that index or dedupe
  purely in memory.
- Any interaction handler must respond (or defer) within Discord's ~3 second
  window. Slow work (AI calls, etc.) must use the deferred response +
  follow-up-edit pattern in `interactionController.js`, not a direct await
  before responding.
- Mirror notification failures must be retried (`utils/mirror.js` +
  the sweep in `server.js`), not just logged and dropped.
- Never log or expose `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`,
  `JWT_SECRET`, or any webhook URL — these stay server-side, in `.env` only.

## Code style
- CommonJS on the backend (`require`/`module.exports`), ESM on the frontend.
- Controllers contain logic; routes just wire `middleware -> controller`.
- Keep components in `frontend/src/pages` for routed pages, `components` for
  shared UI.

## Testing changes locally
See `README.md` section 3. In short: `npm run dev` in both `backend/` and
`frontend/`, tunnel port 5000 with ngrok for real Discord traffic, and use
`npm run register-commands` after changing command definitions in
`backend/scripts/registerCommands.js`.
