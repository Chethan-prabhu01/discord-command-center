const mongoose = require("mongoose");

const CommandRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "status", "report"
    enabled: { type: Boolean, default: true },
    replyMessage: { type: String, default: "" }, // "" => use built-in default
    mirrorEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const ConfigurationSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    guildName: { type: String, default: "" },
    channelId: { type: String, default: "" }, // channel the bot is allowed to post in
    mirrorWebhookUrl: { type: String, default: "" }, // overrides env default per-guild if set
    aiEnabled: { type: Boolean, default: false },
    commands: {
      type: [CommandRuleSchema],
      default: () => [
        { name: "status", enabled: true, replyMessage: "", mirrorEnabled: false },
        { name: "report", enabled: true, replyMessage: "", mirrorEnabled: true },
      ],
    },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Configuration", ConfigurationSchema);
