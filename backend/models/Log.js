const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    // Discord's unique interaction id -- used for dedup. Unique index enforces
    // "never process the same interaction twice" even under a race.
    interactionId: { type: String, required: true, unique: true, index: true },

    guildId: { type: String, index: true },
    channelId: { type: String },
    userId: { type: String },
    username: { type: String },
    command: { type: String, index: true },
    optionsText: { type: String, default: "" }, // raw text arg, e.g. /report <text>

    status: {
      type: String,
      enum: ["received", "responded", "disabled", "error"],
      default: "received",
    },
    responseMessage: { type: String, default: "" },

    aiSummary: { type: String, default: "" },

    mirrorStatus: {
      type: String,
      enum: ["not_applicable", "pending", "sent", "failed"],
      default: "not_applicable",
    },
    mirrorAttempts: { type: Number, default: 0 },
    mirrorError: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", LogSchema);
