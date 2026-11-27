
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity, CheckCircle, XCircle, RefreshCw
} from "lucide-react";

const API = "http://localhost:8000";

export default function ActivityLogs() {
  const [data, setData] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    logs: []
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API}/activity/logs`,
        { withCredentials: true }
      );

      setData(response.data);
    } catch {
      setError("Unable to retrieve activity logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Integration Activity</h2>
          <p>
            Monitor MCP tool executions and failures.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw size={18} />
          Refresh Logs
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="stats">
        <div className="stat-card">
          <Activity size={24} />
          <p>Total Executions</p>
          <h2>{data.total}</h2>
        </div>

        <div className="stat-card">
          <CheckCircle size={24} color="#4ade80" />
          <p>Successful</p>
          <h2 style={{ color: "#4ade80" }}>
            {data.successful}
          </h2>
        </div>

        <div className="stat-card">
          <XCircle size={24} color="#f87171" />
          <p>Failed</p>
          <h2 style={{ color: "#f87171" }}>
            {data.failed}
          </h2>
        </div>
      </div>

      <div className="mcp-panel">
        <h3>Execution History</h3>

        {loading ? (
          <p>Loading activity logs...</p>
        ) : data.logs.length === 0 ? (
          <div className="empty">
            No activity recorded yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Tool Name</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {data.logs.map((log, index) => (
                  <tr key={`${log.timestamp}-${index}`}>
                    <td>{log.tool}</td>

                    <td>
                      <span className={
                        log.status === "Success"
                          ? "log-success"
                          : "log-failed"
                      }>
                        {log.status}
                      </span>
                    </td>

                    <td>{log.duration} ms</td>

                    <td>
                      {new Date(
                        log.timestamp
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
