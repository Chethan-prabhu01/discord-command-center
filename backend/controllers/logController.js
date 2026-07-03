const Log = require("../models/Log");

async function listLogs(req, res) {
  const { command, status, guildId, limit = 50, page = 1 } = req.query;

  const filter = {};
  if (command) filter.command = command;
  if (status) filter.status = status;
  if (guildId) filter.guildId = guildId;

  const perPage = Math.min(Number(limit) || 50, 200);
  const skip = (Math.max(Number(page), 1) - 1) * perPage;

  const [logs, total] = await Promise.all([
    Log.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage),
    Log.countDocuments(filter),
  ]);

  res.json({ logs, total, page: Number(page), perPage });
}

async function logStats(req, res) {
  const [totalCommands, byCommand, mirrorFailures] = await Promise.all([
    Log.countDocuments(),
    Log.aggregate([{ $group: { _id: "$command", count: { $sum: 1 } } }]),
    Log.countDocuments({ mirrorStatus: { $in: ["pending", "failed"] } }),
  ]);

  res.json({ totalCommands, byCommand, mirrorFailures });
}

module.exports = { listLogs, logStats };
