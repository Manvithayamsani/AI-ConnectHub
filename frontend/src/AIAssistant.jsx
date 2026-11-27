
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import {
  Bot, Send, User, Wrench, Trash2
} from "lucide-react";
import "./AIAssistant.css";

const API = "http://localhost:8000";

export default function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();

    const text = question.trim();

    if (!text || loading) return;

    setMessages(prev => [
      ...prev,
      { role: "user", content: text }
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/assistant/chat`,
        { question: text },
        { withCredentials: true }
      );

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content:
            response.data.answer || "No answer returned.",
          tools: response.data.tools_used || []
        }
      ]);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content:
            err.response?.status === 401
              ? "Session expired. Please reconnect GitHub."
              : "Unable to process your request. Please try again.",
          tools: []
        }
      ]);

    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "What language does microsoft/vscode use?",
    "Show open issues in microsoft/vscode",
    "List public repositories of Manvithayamsani"
  ];

  return (
    <section className="assistant-page">

      <div className="section-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Ask questions using AI-powered MCP tools.</p>
        </div>

        <button
          className="primary-btn"
          disabled={loading}
          onClick={() => setMessages([])}
        >
          <Trash2 size={16} />
          Clear Chat
        </button>
      </div>

      <div className="chat-container">

        <div className="chat-messages">

          {messages.length === 0 && (
            <div className="chat-welcome">
              <Bot size={54} color="#818cf8" />

              <h2>How can I help you?</h2>

              <p>
                Explore GitHub repositories, issues
                and project information using AI.
              </p>

              <div className="suggestion-grid">
                {suggestions.map(text => (
                  <button
                    key={text}
                    onClick={() => setQuestion(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.role}`}
            >
              <div className="chat-avatar">
                {msg.role === "user"
                  ? <User size={20} />
                  : <Bot size={20} />}
              </div>

              <div className="chat-bubble">
                {msg.role === "assistant" ? (
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <div>{msg.content}</div>
                )}

                {msg.tools?.length > 0 && (
                  <div className="used-tools">
                    {msg.tools.map((tool, i) => (
                      <span key={`${tool}-${i}`}>
                        <Wrench size={13} />
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="thinking">
              <Bot size={20} />
              Processing your request...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          className="chat-input"
          onSubmit={sendMessage}
        >
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about GitHub repositories..."
            maxLength={2000}
            disabled={loading}
          />

          <button
            className="primary-btn"
            disabled={loading || !question.trim()}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </form>

        <p className="chat-caption">
          Powered by Groq · Model Context Protocol
          · Public GitHub data
        </p>

      </div>
    </section>
  );
}
