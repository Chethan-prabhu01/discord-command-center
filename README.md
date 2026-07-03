# Discord Command Center

A full-stack web app + Discord bot that handles slash commands via Discord's
Interactions API, logs every command to a database, responds in Discord,
mirrors a notification to a second channel (Slack or another Discord
channel), and exposes an admin dashboard (behind login) to view the live log
and configure command behavior.

**Stack:** React (Vite) · Express (Node.js) · MongoDB Atlas · JWT auth ·
Discord Interactions API · Slack/Discord webhooks · optional Gemini AI.

---

## 1. Project structure

```
discord-command-center/
├── backend/
│   ├── config/db.js                 Mongo connection
│   ├── models/                      User, Log, Configuration
│   ├── middleware/
│   │   ├── auth.js                  JWT guard for dashboard API routes
│   │   └── verifyDiscordRequest.js  Ed25519 signature verification
│   ├── controllers/                 auth, interaction, log, config logic
│   ├── routes/                      Express routers
│   ├── utils/
│   │   ├── discord.js               Discord REST helpers (follow-up edit, post)
│   │   ├── mirror.js                Slack/Discord mirror + retry sweep
│   │   └── ai.js                    Optional Gemini summarization
│   ├── scripts/
│   │   ├── registerCommands.js      Registers /status and /report with Discord
│   │   └── seedAdmin.js             Creates a throwaway admin login
│   ├── server.js                    App entrypoint
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                   Login, Register, Dashboard, Logs, Settings
│   │   ├── components/              Navbar, ProtectedRoute
│   │   └── services/api.js          Axios instance with JWT header
│   └── .env.example
├── AI_NOTES.md
├── CLAUDE.md
└── README.md
```

---

## 2. What it does

1. An admin registers/logs into the dashboard, then "connects a server" under
   **Settings** by entering the Discord guild (server) ID, the channel ID the
   bot should treat as its home channel, and (optionally) a mirror webhook
   URL and per-command rules.
2. Users run `/status` or `/report <text>` in that Discord server.
3. Discord POSTs the interaction to `/api/interactions`. The request is:
   - Verified against Discord's Ed25519 signature (rejects forged/replayed
     requests with 401).
   - Answered with `PONG` if it's Discord's handshake `PING`.
   - Deduplicated on Discord's `interaction.id` (a unique Mongo index on
     `interactionId` guarantees a command is never double-processed, even
     under a race).
   - Checked against the per-guild command config (disabled commands get a
     polite "disabled" reply instead of running).
4. The bot replies in Discord (immediately, or via a **deferred** response +
   follow-up edit if the AI stretch goal is on and the LLM call is slow —
   this keeps every response inside Discord's ~3 second window).
5. The command + result is mirrored to a second channel (Slack Incoming
   Webhook or a separate Discord channel webhook). If that call fails, the
   log is marked `pending`, not lost — a background sweep in `server.js`
   retries it every 60 seconds (up to 5 attempts) so a brief outage never
   drops a notification.
6. The dashboard shows a live-polling command log, per-command stats, and a
   settings page to edit command rules per connected server.

---

## 3. Local setup

### Prerequisites

- Node.js 18+
- A free MongoDB Atlas cluster (no card required)
- A Discord account + a test server you can add a bot to

### 3.1 Clone and install

```bash
cd discord-command-center

cd backend
npm install

cd ../frontend
npm install
```

### 3.2 Create a Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** and copy it → `DISCORD_BOT_TOKEN`.
3. Under **General Information**, copy the **Public Key** → `DISCORD_PUBLIC_KEY`
   and the **Application ID** → `DISCORD_APPLICATION_ID`.
4. Under **OAuth2 → URL Generator**, check scopes `bot` and
   `applications.commands`, and permissions `Send Messages` +
   `Use Slash Commands` + `Read Message History`. Open the generated URL and
   add the bot to your test server.

### 3.3 Configure environment variables

```bash
cd backend
cp .env.example .env
# fill in MONGODB_URI, JWT_SECRET, DISCORD_* values, and a mirror webhook URL

cd ../frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000 (or your deployed backend URL)
```

### 3.4 Register slash commands and seed an admin login

```bash
cd backend
npm run register-commands   # registers /status and /report with Discord
npm run seed-admin          # creates the admin login from ADMIN_SEED_USERNAME/PASSWORD
```

### 3.5 Run locally

```bash
# terminal 1
cd backend
npm run dev        # http://localhost:5000

# terminal 2
cd frontend
npm run dev         # http://localhost:5173
```

### 3.6 Exposing your local server to Discord (for local testing only)

Discord cannot call `localhost`. Use a tunnel like [ngrok](https://ngrok.com/)
to test locally before deploying:

```bash
ngrok http 5000
```

Then set your Discord app's **Interactions Endpoint URL** (under
**General Information**) to `https://<ngrok-id>.ngrok-free.app/api/interactions`.
Discord will immediately send a PING to verify it — a 401 here almost always
means `DISCORD_PUBLIC_KEY` is wrong or the raw body isn't being captured
correctly (see `server.js`'s `express.json({ verify })` hook).

---

## 4. Deployment

**Backend → Render (free tier, no card):**

1. Push this repo to GitHub.
2. New **Web Service** on Render, root directory `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all variables from `backend/.env.example` in Render's Environment tab.
5. Render's free tier sleeps after inactivity — Discord's endpoint must
   respond within 3 seconds, so keep the service warm with a free uptime
   pinger (e.g. UptimeRobot) hitting `/health` every few minutes.

**Frontend → Vercel (free tier, no card):**

1. New Project on Vercel, root directory `frontend`.
2. Framework preset: Vite.
3. Add `VITE_API_URL` = your Render backend URL.

**Database → MongoDB Atlas (free tier, no card):**

1. Create a free M0 cluster.
2. Create a database user and allow access from anywhere (`0.0.0.0/0`) for
   simplicity, or Render's specific egress IPs for tighter security.
3. Copy the connection string into `MONGODB_URI`.

**After deploying:**

1. Set the Discord app's Interactions Endpoint URL to
   `https://<your-render-app>.onrender.com/api/interactions`.
2. Re-run `npm run register-commands` if you haven't already (uses the
   Discord API directly, not your server, so it works regardless of where
   the app is hosted).

---

## 5. Testing it end-to-end

1. Log into the dashboard, go to **Settings**, and connect your test
   server's Guild ID (right-click your server icon in Discord → _Copy
   Server ID_; enable Developer Mode under Discord settings if you don't see
   this option).
2. In your Discord server, run `/status`. You should see the bot reply, and
   a new row appear on the **Dashboard** within ~5 seconds.
3. Run `/report Something is broken`. You should see the bot reply, and a
   message land in your Slack channel / mirror Discord channel.
4. To test the security requirements yourself: `curl -X POST` your
   `/api/interactions` URL with a bogus body and no signature headers — you
   should get a 401.
5. To test dedup: Discord will occasionally retry a slow interaction with
   the same `id`; you can simulate this by replaying a captured payload —
   the second delivery should return the cached response, and there should
   be exactly one row in the log for that `interactionId`.

**Test credentials for reviewers:** see the throwaway admin account details
provided separately (created via `npm run seed-admin`), and the Discord
server invite link.

---

## 6. Known limitations / what's not implemented

- Buttons / modal (`MESSAGE_COMPONENT` / `MODAL_SUBMIT`) interactions are
  stubbed but not fully built out — the interaction type check exists in
  `interactionController.js`, ready to extend.
- "Live" dashboard updates use 5-second polling rather than Socket.io —
  simpler to run reliably on free hosting, documented as a stretch goal.
- Multi-server support exists at the data layer (`Configuration` is keyed by
  `guildId`), but the UI only shows one server's settings at a time.

See `AI_NOTES.md` for how AI tools were used while building this.
