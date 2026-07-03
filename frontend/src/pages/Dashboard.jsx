import { useEffect, useState } from "react";
import api from "../services/api";

/**
 * "Live" here is done via short-interval polling (every 5s), which is
 * simple and reliable on free hosting tiers. Swapping this for a
 * Socket.io push is a documented stretch goal -- see README.
 */
export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get("/api/logs?limit=15"),
        api.get("/api/logs/stats"),
      ]);
      setLogs(logsRes.data.logs);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="page">Loading...</p>;

  return (
    <div className="page">
      <h1>Dashboard</h1>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalCommands}</div>
            <div className="stat-label">Total commands</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.mirrorFailures}</div>
            <div className="stat-label">Mirror issues</div>
          </div>
          {stats.byCommand.map((c) => (
            <div className="stat-card" key={c._id}>
              <div className="stat-value">{c.count}</div>
              <div className="stat-label">/{c._id}</div>
            </div>
          ))}
        </div>
      )}

      <h2>Recent activity</h2>
      <table className="log-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Command</th>
            <th>User</th>
            <th>Status</th>
            <th>Mirror</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id}>
              <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
              <td>/{log.command}</td>
              <td>{log.username || log.userId}</td>
              <td>
                <span className={`badge badge-${log.status}`}>{log.status}</span>
              </td>
              <td>
                <span className={`badge badge-${log.mirrorStatus}`}>{log.mirrorStatus}</span>
              </td>
              <td className="truncate">{log.responseMessage}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan="6">No commands recorded yet. Run /status in Discord to test.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
