import { useEffect, useState } from "react";
import api from "../services/api";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchLogs() {
    const params = { page, limit: 20 };
    if (command) params.command = command;
    if (status) params.status = status;
    const { data } = await api.get("/api/logs", { params });
    setLogs(data.logs);
    setTotal(data.total);
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, status, page]);

  return (
    <div className="page">
      <h1>Command Logs</h1>

      <div className="filters">
        <select value={command} onChange={(e) => setCommand(e.target.value)}>
          <option value="">All commands</option>
          <option value="status">/status</option>
          <option value="report">/report</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="received">received</option>
          <option value="responded">responded</option>
          <option value="disabled">disabled</option>
          <option value="error">error</option>
        </select>
      </div>

      <table className="log-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Interaction ID</th>
            <th>Command</th>
            <th>Text</th>
            <th>User</th>
            <th>Status</th>
            <th>Mirror</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td className="mono">{log.interactionId.slice(0, 10)}...</td>
              <td>/{log.command}</td>
              <td className="truncate">{log.optionsText}</td>
              <td>{log.username || log.userId}</td>
              <td>
                <span className={`badge badge-${log.status}`}>{log.status}</span>
              </td>
              <td>
                <span className={`badge badge-${log.mirrorStatus}`}>{log.mirrorStatus}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} ({total} total)
        </span>
        <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
