const axios = require("axios");
const Log = require("../models/Log");

/**
 * Sends a mirror notification to either a Slack Incoming Webhook or a
 * Discord channel webhook. Both accept a simple JSON POST, so we detect
 * which shape to send based on the URL.
 */
async function sendToWebhook(webhookUrl, { title, fields }) {
  const isDiscordWebhook = webhookUrl.includes("discord.com/api/webhooks");

  if (isDiscordWebhook) {
    const content = `**${title}**\n${fields.map((f) => `**${f.label}:** ${f.value}`).join("\n")}`;
    return axios.post(webhookUrl, { content }, { timeout: 8000 });
  }

  // Slack Incoming Webhook format
  const text = `*${title}*\n${fields.map((f) => `*${f.label}:* ${f.value}`).join("\n")}`;
  return axios.post(webhookUrl, { text }, { timeout: 8000 });
}

/**
 * Attempts to mirror a single log entry. On failure it marks the log as
 * "pending" (not "failed") so the retry sweep in server.js will pick it
 * back up -- this is what satisfies "must not silently lose an
 * interaction if the mirror channel is briefly unavailable".
 */
async function mirrorLog(log, webhookUrl) {
  if (!webhookUrl) {
    log.mirrorStatus = "not_applicable";
    await log.save();
    return;
  }

  try {
    await sendToWebhook(webhookUrl, {
      title: "New command interaction",
      fields: [
        { label: "Command", value: `/${log.command}` },
        { label: "User", value: log.username || log.userId },
        { label: "Server", value: log.guildId },
        { label: "Text", value: log.optionsText || "(none)" },
        { label: "Time", value: new Date(log.createdAt || Date.now()).toISOString() },
      ],
    });
    log.mirrorStatus = "sent";
    log.mirrorError = "";
  } catch (err) {
    log.mirrorAttempts = (log.mirrorAttempts || 0) + 1;
    log.mirrorError = err.message;
    // Give up after 5 attempts so a permanently-dead webhook doesn't retry forever.
    log.mirrorStatus = log.mirrorAttempts >= 5 ? "failed" : "pending";
  }

  await log.save();
}

/** Background sweep: re-attempts any mirror notifications still marked "pending". */
async function retryPendingMirrors(defaultWebhookUrl) {
  const pending = await Log.find({ mirrorStatus: "pending" }).limit(25);
  for (const log of pending) {
    await mirrorLog(log, defaultWebhookUrl);
  }
}

module.exports = { mirrorLog, retryPendingMirrors };
