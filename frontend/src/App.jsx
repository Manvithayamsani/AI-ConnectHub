
import { useEffect, useState } from "react";
import axios from "axios";

import {
  GitBranch,
  LayoutDashboard,
  Plug,
  FolderGit2,
  Activity,
  Wrench,
  Settings,
  LogOut,
  Search,
  Star,
  Bot
} from "lucide-react";

import "./App.css";
import MCPTools from "./MCPTools";
import ActivityLogs from "./ActivityLogs";
import AIAssistant from "./AIAssistant";

const API = "http://localhost:8000";

function App() {
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("overview");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const auth = await axios.get(
          `${API}/auth/status`,
          { withCredentials: true }
        );

        if (auth.data.authenticated) {
          setUser(auth.data.user);

          const response = await axios.get(
            `${API}/github/repositories`,
            { withCredentials: true }
          );

          setRepos(response.data.repositories);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          setUser(null);
          setRepos([]);
        } else {
          setError("Unable to load dashboard.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function connectGithub() {
    window.location.href = `${API}/auth/github`;
  }

  async function logout() {
    try {
      await axios.post(
        `${API}/auth/logout`,
        {},
        { withCredentials: true }
      );

      setUser(null);
      setRepos([]);
      setError("");
      setActivePage("overview");
    } catch {
      setError("Logout failed. Please retry.");
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(
      search.toLowerCase()
    )
  );

  const navigation = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard
    },
    {
      id: "connectors",
      label: "Connectors",
      icon: Plug
    },
    {
      id: "repositories",
      label: "Repositories",
      icon: FolderGit2
    },
    {
      id: "mcp",
      label: "MCP Tools",
      icon: Wrench
    },
    {
      id: "assistant",
      label: "AI Assistant",
      icon: Bot
    },
    {
      id: "activity",
      label: "Activity Logs",
      icon: Activity
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings
    }
  ];

  const pageTitles = {
    overview: "Integration Overview",
    connectors: "Connectors",
    repositories: "Repositories",
    mcp: "MCP Tools",
    assistant: "AI Assistant",
    activity: "Activity Logs",
    settings: "Settings"
  };

  function renderAuthRequired() {
    return (
      <div className="empty">
        <p>Connect GitHub to access this feature.</p>

        <button
          className="primary-btn"
          onClick={connectGithub}
        >
          Connect GitHub
        </button>
      </div>
    );
  }

  function renderConnectors() {
    return (
      <>
        <h2>Connectors</h2>

        <section className="connector">
          <GitBranch size={40} />

          <div className="connector-info">
            <h3>GitHub</h3>
            <p>OAuth 2.0 · REST API Integration</p>
          </div>

          {user ? (
            <span className="connected">
              Connected
            </span>
          ) : (
            <button
              className="primary-btn"
              onClick={connectGithub}
            >
              Connect GitHub
            </button>
          )}
        </section>
      </>
    );
  }

  function renderRepositories() {
    return (
      <>
        <div className="section-header">
          <h2>Your Repositories</h2>

          <div className="search">
            <Search size={18} />

            <input
              placeholder="Search repositories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p>Loading repositories...</p>
        ) : !user ? (
          renderAuthRequired()
        ) : filteredRepos.length === 0 ? (
          <div className="empty">
            No repositories found.
          </div>
        ) : (
          <div className="repo-grid">
            {filteredRepos.map(repo => (
              <a
                className="repo-card"
                key={repo.url}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FolderGit2 size={20} />

                <h3>{repo.name}</h3>

                <p>
                  {repo.description || "No description"}
                </p>

                <div className="repo-footer">
                  <span>
                    {repo.language || "Not specified"}
                  </span>

                  <span>
                    <Star size={14} />
                    {repo.stars}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderOverview() {
    return (
      <>
        <section className="stats">
          <div className="stat-card">
            <Plug size={22} />
            <p>Connected Accounts</p>
            <h2>{user ? 1 : 0}</h2>
          </div>

          <div className="stat-card">
            <FolderGit2 size={22} />
            <p>Repositories Retrieved</p>
            <h2>{repos.length}</h2>
          </div>

          <div className="stat-card">
            <Wrench size={22} />
            <p>Implemented MCP Tools</p>
            <h2>4</h2>
          </div>
        </section>

        {renderConnectors()}
        {renderRepositories()}
      </>
    );
  }

  function renderSettings() {
    if (!user) {
      return renderAuthRequired();
    }

    return (
      <section className="mcp-panel">
        <h2>Account Settings</h2>

        <div className="profile">
          <img
            src={user.avatar}
            alt="GitHub profile"
          />

          <span>{user.username}</span>
        </div>

        <p>Authentication: GitHub OAuth 2.0</p>
        <p>AI Provider: Groq</p>
        <p>Protocol: Model Context Protocol</p>
        <p>Data access: Public repositories</p>

        <button
          className="primary-btn"
          onClick={logout}
        >
          <LogOut size={18} />
          Logout
        </button>
      </section>
    );
  }

  function renderPage() {
    if (loading) {
      return <p>Loading dashboard...</p>;
    }

    switch (activePage) {
      case "overview":
        return renderOverview();

      case "connectors":
        return renderConnectors();

      case "repositories":
        return renderRepositories();

      case "mcp":
        return user
          ? <MCPTools />
          : renderAuthRequired();

      case "assistant":
        return user
          ? <AIAssistant />
          : renderAuthRequired();

      case "activity":
        return user
          ? <ActivityLogs />
          : renderAuthRequired();

      case "settings":
        return renderSettings();

      default:
        return renderOverview();
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">

        <h2 className="brand">
          <Plug size={24} /> AI ConnectHub
        </h2>

        <p className="menu-label">
          WORKSPACE
        </p>

        <nav>
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${
                  activePage === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setActivePage(item.id);
                  window.scrollTo(0, 0);
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

      </aside>

      <main className="main">

        <header className="topbar">
          <div>
            <h1>{pageTitles[activePage]}</h1>

            <p>
              Manage your AI connectors and data sources.
            </p>
          </div>

          {user && (
            <div className="profile">
              <img src={user.avatar} alt="Profile" />

              <span>{user.username}</span>

              <button
                onClick={logout}
                aria-label="Logout"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </header>

        {error && (
          <p className="error">{error}</p>
        )}

        {renderPage()}

      </main>
    </div>
  );
}

export default App;
