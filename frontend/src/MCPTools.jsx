
import { useEffect, useState } from "react";
import axios from "axios";
import { Wrench, Play, RefreshCw } from "lucide-react";

const API = "http://localhost:8000";

export default function MCPTools() {
  const [tools, setTools] = useState([]);
  const [selected, setSelected] = useState(null);
  const [args, setArgs] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTools() {
    setError("");

    try {
      const response = await axios.get(
        `${API}/mcp/tools`,
        { withCredentials: true }
      );

      setTools(response.data.tools);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load MCP tools."
      );
    }
  }

  useEffect(() => {
    loadTools();
  }, []);

  function selectTool(tool) {
    setSelected(tool);
    setArgs({});
    setResult(null);
    setError("");
  }

  async function executeTool(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post(
        `${API}/mcp/execute`,
        {
          name: selected.name,
          arguments: args
        },
        { withCredentials: true }
      );

      const data = response.data.result;

      const output =
        data.structured_content ??
        data.structuredContent ??
        data.content;

      if (
        data.is_error ||
        data.isError ||
        output?.error ||
        output?.result?.error
      ) {
        setError("MCP tool returned an error.");
      }

      setResult(output);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Tool execution failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>MCP Tool Playground</h2>
          <p>Discover and execute connected MCP tools.</p>
        </div>

        <button
          className="primary-btn"
          onClick={loadTools}
        >
          <RefreshCw size={16} /> Refresh Tools
        </button>
      </div>

      <div className="mcp-layout">
        <div className="mcp-panel">
          <h3>Available Tools ({tools.length})</h3>

          {tools.map(tool => (
            <button
              key={tool.name}
              className={`tool-item ${
                selected?.name === tool.name
                  ? "selected" : ""
              }`}
              onClick={() => selectTool(tool)}
              disabled={loading}
            >
              <Wrench size={18} />
              <div>
                <strong>{tool.name}</strong>
                <p>{tool.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mcp-panel">
          {error && <p className="error">{error}</p>}

          {!selected ? (
            <div className="empty">
              Select a tool to begin execution.
            </div>
          ) : (
            <>
              <h3>{selected.name}</h3>
              <p>{selected.description}</p>

              <form onSubmit={executeTool}>
                {Object.entries(
                  selected.input_schema?.properties || {}
                ).map(([name]) => (
                  <div className="tool-field" key={name}>
                    <label>{name}</label>

                    <input
                      value={args[name] || ""}
                      placeholder={`Enter ${name}`}
                      required={
                        selected.input_schema?.required
                          ?.includes(name)
                      }
                      onChange={e =>
                        setArgs({
                          ...args,
                          [name]: e.target.value
                        })
                      }
                    />
                  </div>
                ))}

                <button
                  className="primary-btn"
                  disabled={loading}
                >
                  <Play size={16} />

                  {loading
                    ? "Executing..."
                    : "Execute Tool"}
                </button>
              </form>

              {result !== null && (
                <>
                  <h3 className="result-title">
                    Execution Result
                  </h3>

                  <pre className="tool-result">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
