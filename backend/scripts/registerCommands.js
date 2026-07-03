/**
 * Run once (and again whenever you change command definitions):
 *   npm run register-commands
 *
 * Registers global commands. Global commands can take up to ~1 hour to
 * propagate; for instant testing, temporarily switch the URL below to the
 * guild-scoped endpoint (see commented alternative).
 */
require("dotenv").config();
const axios = require("axios");

const { DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APPLICATION_ID || !DISCORD_BOT_TOKEN) {
  console.error("DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be set in .env");
  process.exit(1);
}

const commands = [
  {
    name: "status",
    description: "Check whether the bot is online",
    type: 1,
  },
  {
    name: "report",
    description: "Submit a short report or note",
    type: 1,
    options: [
      {
        name: "text",
        description: "What do you want to report?",
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

async function main() {
  const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;

  // Guild-scoped alternative (updates instantly, good for testing):
  // const GUILD_ID = "<your_test_guild_id>";
  // const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${GUILD_ID}/commands`;

  const res = await axios.put(url, commands, {
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  console.log(`Registered ${res.data.length} commands:`, res.data.map((c) => c.name));
}

main().catch((err) => {
  console.error("Failed to register commands:", err.response?.data || err.message);
  process.exit(1);
});
