const Configuration = require("../models/Configuration");

async function listConfigs(req, res) {
  const configs = await Configuration.find().sort({ createdAt: -1 });
  res.json({ configs });
}

async function getConfig(req, res) {
  const config = await Configuration.findOne({ guildId: req.params.guildId });
  if (!config) return res.status(404).json({ error: "no config found for this guild" });
  res.json({ config });
}

/** Creates or updates the config for a guild -- this is "connecting a server" from the admin UI. */
async function upsertConfig(req, res) {
  const { guildId, guildName, channelId, mirrorWebhookUrl, aiEnabled, commands } = req.body;
  if (!guildId) return res.status(400).json({ error: "guildId is required" });

  const update = {
    ...(guildName !== undefined && { guildName }),
    ...(channelId !== undefined && { channelId }),
    ...(mirrorWebhookUrl !== undefined && { mirrorWebhookUrl }),
    ...(aiEnabled !== undefined && { aiEnabled }),
    ...(commands !== undefined && { commands }),
    connectedBy: req.user.sub,
  };

  const config = await Configuration.findOneAndUpdate(
    { guildId },
    { $set: update, $setOnInsert: { guildId } },
    { upsert: true, new: true }
  );

  res.json({ config });
}

module.exports = { listConfigs, getConfig, upsertConfig };
