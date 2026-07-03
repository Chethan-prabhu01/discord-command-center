const Log = require("../models/Log");
const Configuration = require("../models/Configuration");
const { mirrorLog } = require("../utils/mirror");
const { editOriginalInteractionResponse } = require("../utils/discord");
const { summarizeReportText } = require("../utils/ai");

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3, MODAL_SUBMIT: 5 };
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  UPDATE_MESSAGE: 7,
};

/** Pulls the first STRING option's value, e.g. the <text> in /report <text>. */
function getFirstStringOption(data) {
  const opt = (data.options || []).find((o) => typeof o.value === "string");
  return opt ? opt.value : "";
}

async function getOrCreateConfig(guildId) {
  let config = await Configuration.findOne({ guildId });
  if (!config) {
    config = await Configuration.create({ guildId });
  }
  return config;
}

async function handleInteraction(req, res) {
  const body = req.body;

  // 1. Discord's handshake check -- must answer every PING with a PONG,
  // or Discord will refuse to save this endpoint at all.
  if (body.type === InteractionType.PING) {
    return res.json({ type: InteractionResponseType.PONG });
  }

  if (body.type !== InteractionType.APPLICATION_COMMAND) {
    // Buttons / modals stretch goal would branch here on MESSAGE_COMPONENT / MODAL_SUBMIT.
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Unsupported interaction type.", flags: 64 },
    });
  }

  const interactionId = body.id;
  const commandName = body.data?.name;
  const guildId = body.guild_id;
  const channelId = body.channel_id;
  const discordUser = body.member?.user || body.user || {};
  const optionsText = getFirstStringOption(body.data || {});

  // 2. Dedup: Discord may deliver the same interaction more than once
  // (retries on slow/ambiguous responses). The unique index on
  // interactionId is the real guarantee; this pre-check just avoids
  // doing the work twice and returns the same effective ack fast.
  const existing = await Log.findOne({ interactionId });
  if (existing) {
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: existing.responseMessage || "Already processed.", flags: 64 },
    });
  }

  let log;
  try {
    log = await Log.create({
      interactionId,
      guildId,
      channelId,
      userId: discordUser.id,
      username: discordUser.username,
      command: commandName,
      optionsText,
      status: "received",
    });
  } catch (err) {
    // Race: two near-simultaneous deliveries both passed the findOne check.
    // The unique index rejects the second insert -- fetch and reuse it.
    if (err.code === 11000) {
      const winner = await Log.findOne({ interactionId });
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: winner?.responseMessage || "Already processed.", flags: 64 },
      });
    }
    console.error("[interactions] failed to create log:", err);
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Something went wrong recording this command.", flags: 64 },
    });
  }

  const config = await getOrCreateConfig(guildId);
  const rule = config.commands.find((c) => c.name === commandName);

  if (!rule || !rule.enabled) {
    log.status = "disabled";
    log.responseMessage = "This command is currently disabled by the server admin.";
    await log.save();
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: log.responseMessage, flags: 64 },
    });
  }

  const mirrorUrl =
    config.mirrorWebhookUrl || process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_MIRROR_WEBHOOK_URL;
  const shouldMirror = rule.mirrorEnabled && mirrorUrl;
  log.mirrorStatus = shouldMirror ? "pending" : "not_applicable";

  // If AI is on for /report, that call can be slow -- defer instead of
  // risking Discord's ~3s timeout, then PATCH the real answer in after.
  const wantsAi = commandName === "report" && config.aiEnabled && optionsText;

  if (wantsAi) {
    log.status = "received";
    await log.save();

    // Respond immediately with a deferred ack (type 5) to stay inside the
    // 3-second window, then do the slow AI + mirror work in the background.
    res.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

    (async () => {
      const summary = await summarizeReportText(optionsText);
      log.aiSummary = summary || "";
      log.responseMessage = rule.replyMessage || "Report received and triaged.";
      log.status = "responded";
      await log.save();

      try {
        await editOriginalInteractionResponse(
          process.env.DISCORD_APPLICATION_ID,
          body.token,
          summary ? `${log.responseMessage}\n_Summary: ${summary}_` : log.responseMessage
        );
      } catch (err) {
        console.error("[interactions] follow-up edit failed:", err.message);
      }

      if (shouldMirror) await mirrorLog(log, mirrorUrl);
    })();

    return;
  }

  // Fast path: respond immediately within the 3-second window.
  const responseMessage =
    rule.replyMessage ||
    (commandName === "status" ? "Bot is online and processing commands." : "Report received. Thank you!");

  log.status = "responded";
  log.responseMessage = responseMessage;
  await log.save();

  res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: responseMessage },
  });

  if (shouldMirror) {
    // Fire-and-forget: never block the Discord response on the mirror call.
    mirrorLog(log, mirrorUrl).catch((err) =>
      console.error("[interactions] mirror failed:", err.message)
    );
  }
}

module.exports = { handleInteraction };
