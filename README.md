
# AI ConnectHub

An AI-powered integration platform that connects
external data sources to AI assistants using the
Model Context Protocol (MCP).

## Features

- Interactive React dashboard
- GitHub REST API integration
- GitHub OAuth 2.0 authentication
- Delegated OAuth credentials through MCP
- Dynamic MCP tool discovery
- Schema-driven tool execution
- Natural-language AI assistant using Groq
- Session-based authentication
- Tool execution monitoring and activity logs
- API error handling and bounded retries
- Automated unit testing
- Docker containerization
- GitHub Actions continuous integration

## Technology Stack

Frontend:
React, Vite, Axios, Lucide React

Backend:
Python, FastAPI

AI and Integration:
Model Context Protocol, Groq, GitHub REST API

Security:
OAuth 2.0, CSRF state validation, session management,
server-side token storage, tool allowlisting

DevOps:
Docker, Docker Compose, GitHub Actions, Pytest

## Architecture

React Dashboard
    |
FastAPI API Gateway
    |
MCP Client
    |
MCP Server
    |
GitHub REST API

The AI assistant uses Groq function calling to
dynamically select and execute MCP tools.

## Available MCP Tools

- get_repository
- list_repositories
- get_issues
- get_authenticated_user

## Local Installation

1. Clone the repository.
2. Copy .env.example to .env.
3. Configure GitHub OAuth and Groq credentials.
4. Start Docker Desktop.
5. Run:

   docker compose up --build -d

## Application URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Automated Testing

Run:

    docker compose exec backend .venv/bin/python -m pytest test_github_connector.py -v

Test coverage includes:

- Successful API requests
- Resource-not-found handling
- API rate-limit detection
- Connection failures and retry behaviour

All four unit tests passed in Windows and Linux
Docker environments.

## Security and Data Privacy

- Credentials are stored in environment variables.
- OAuth access tokens remain on the backend.
- MCP tools are restricted to approved operations.
- Repository retrieval is limited to public data.
- Sensitive credentials are excluded from activity logs.

## Current Limitations

- Session and activity data are stored in memory.
- Application is configured for local deployment.
- Comprehensive production security testing is pending.
- AI requests are processed independently.
- Continuous integration is configured but requires
  verification on GitHub.

## Attribution

This project extends the official MCP Python SDK:

https://github.com/modelcontextprotocol/python-sdk

AI ConnectHub adds a custom React dashboard,
FastAPI integration layer, GitHub connectors,
delegated OAuth, AI assistant, activity monitoring,
unit tests and Docker configuration.

The original SDK license and attribution are retained.
