const axios = require("axios");

const DISCORD_API = "https://discord.com/api/v10";

const botClient = axios.create({
  baseURL: DISCORD_API,
  headers: {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 8000,
});

/**
 * Used for the "slow work" path: if we deferred the interaction (type 5),
 * Discord gives us up to 15 minutes to PATCH the original deferred message
 * via this endpoint, using only the interaction token (no bot token needed
 * for this specific call, but we keep the client consistent).
 */
async function editOriginalInteractionResponse(applicationId, interactionToken, content) {
  const url = `${DISCORD_API}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
  return axios.patch(url, { content }, { timeout: 8000 });
}

/** Post a plain message into a specific channel using the bot token. */
async function postToChannel(channelId, content) {
  return botClient.post(`/channels/${channelId}/messages`, { content });
}

module.exports = {
  botClient,
  editOriginalInteractionResponse,
  postToChannel,
};
