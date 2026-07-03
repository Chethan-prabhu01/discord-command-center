import { useEffect, useState } from "react";
import api from "../services/api";

const emptyForm = {
  guildId: "",
  guildName: "",
  channelId: "",
  mirrorWebhookUrl: "",
  aiEnabled: false,
  commands: [
    { name: "status", enabled: true, replyMessage: "", mirrorEnabled: false },
    { name: "report", enabled: true, replyMessage: "", mirrorEnabled: true },
  ],
};

export default function Settings() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);

  async function fetchConfigs() {
    const { data } = await api.get("/api/config");
    setConfigs(data.configs);
  }

  useEffect(() => {
    fetchConfigs();
  }, []);

  function updateCommandRule(index, field, value) {
    setForm((f) => {
      const commands = [...f.commands];
      commands[index] = { ...commands[index], [field]: value };
      return { ...f, commands };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await api.put("/api/config", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetchConfigs();
  }

  function loadExisting(config) {
    setForm({
      guildId: config.guildId,
      guildName: config.guildName || "",
      channelId: config.channelId || "",
      mirrorWebhookUrl: config.mirrorWebhookUrl || "",
      aiEnabled: config.aiEnabled,
      commands: config.commands,
    });
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <h2>Connected servers</h2>
      <ul className="server-list">
        {configs.map((c) => (
          <li key={c.guildId}>
            <button className="link-button" onClick={() => loadExisting(c)}>
              {c.guildName || c.guildId}
            </button>
          </li>
        ))}
        {configs.length === 0 && <li>No servers connected yet. Add one below.</li>}
      </ul>

      <h2>Connect / edit a server</h2>
      <form className="card" onSubmit={handleSubmit}>
        <label>Guild (server) ID</label>
        <input
          value={form.guildId}
          onChange={(e) => setForm({ ...form, guildId: e.target.value })}
          placeholder="Right-click your server in Discord > Copy Server ID"
          required
        />

        <label>Server name (label only)</label>
        <input
          value={form.guildName}
          onChange={(e) => setForm({ ...form, guildName: e.target.value })}
        />

        <label>Channel ID the bot posts to</label>
        <input
          value={form.channelId}
          onChange={(e) => setForm({ ...form, channelId: e.target.value })}
        />

        <label>Mirror webhook URL (Slack or Discord)</label>
        <input
          value={form.mirrorWebhookUrl}
          onChange={(e) => setForm({ ...form, mirrorWebhookUrl: e.target.value })}
          placeholder="Leave blank to use the server-wide default from .env"
        />

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.aiEnabled}
            onChange={(e) => setForm({ ...form, aiEnabled: e.target.checked })}
          />
          Enable AI summary for /report (Gemini)
        </label>

        <h3>Command rules</h3>
        {form.commands.map((cmd, i) => (
          <div className="command-rule" key={cmd.name}>
            <strong>/{cmd.name}</strong>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={cmd.enabled}
                onChange={(e) => updateCommandRule(i, "enabled", e.target.checked)}
              />
              Enabled
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={cmd.mirrorEnabled}
                onChange={(e) => updateCommandRule(i, "mirrorEnabled", e.target.checked)}
              />
              Mirror to second channel
            </label>
            <input
              placeholder="Custom reply message (optional)"
              value={cmd.replyMessage}
              onChange={(e) => updateCommandRule(i, "replyMessage", e.target.value)}
            />
          </div>
        ))}

        <button type="submit">Save configuration</button>
        {saved && <p className="success">Saved!</p>}
      </form>
    </div>
  );
}
