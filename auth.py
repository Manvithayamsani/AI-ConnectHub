import json
import os
import secrets
import time

from collections import deque
from datetime import datetime, timezone
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware
from ai_assistant import ask_assistant
from pydantic import Field


from mcp_client import execute_mcp_tool, list_mcp_tools

load_dotenv()

TOKEN_STORE = {}
SESSION_DURATION = 1800

app = FastAPI(title="AI ConnectHub")

CLIENT_ID = os.environ["GITHUB_CLIENT_ID"]
CLIENT_SECRET = os.environ["GITHUB_CLIENT_SECRET"]
REDIRECT_URI = os.environ["GITHUB_REDIRECT_URI"]

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
    max_age=1800,
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class MCPToolRequest(BaseModel):
    name: str
    arguments: dict


def require_session(request: Request):
    session_id = request.session.get("session_id")
    session = TOKEN_STORE.get(session_id)

    if not session:
        raise HTTPException(401, "Please connect GitHub")

    if time.time() >= session["expires_at"]:
        TOKEN_STORE.pop(session_id, None)
        request.session.clear()
        raise HTTPException(401, "Session expired")

    return session


def record_activity(session, tool, status, duration):
    logs = session.setdefault("activity_logs", deque(maxlen=100))

    logs.appendleft(
        {
            "tool": tool,
            "status": status,
            "duration": round(duration, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


@app.get("/")
def home():
    return {"message": "AI ConnectHub API is running"}


@app.get("/auth/github")
def github_login(request: Request):
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "state": state,
        "scope": "",
    }

    return RedirectResponse(
        "https://github.com/login/oauth/authorize?" + urlencode(params)
    )


@app.get("/auth/github/callback")
def github_callback(request: Request, code: str = "", state: str = ""):
    expected_state = request.session.pop("oauth_state", "")

    if not expected_state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(400, "Invalid OAuth state")

    if not code:
        raise HTTPException(400, "Authorization denied")

    try:
        response = requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
        response.raise_for_status()
        token = response.json().get("access_token")

        if not token:
            raise HTTPException(400, "Token exchange failed")

        user_response = requests.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=15,
        )
        user_response.raise_for_status()
        user = user_response.json()

        session_id = secrets.token_urlsafe(32)
        TOKEN_STORE[session_id] = {
            "token": token,
            "expires_at": time.time() + SESSION_DURATION,
        }
        request.session["session_id"] = session_id
        request.session["github_user"] = {
            "username": user["login"],
            "name": user.get("name") or user["login"],
            "avatar": user["avatar_url"],
        }

    except requests.exceptions.RequestException:
        raise HTTPException(502, "GitHub service request failed")

    return RedirectResponse(url="http://localhost:5173")


@app.get("/auth/status")
def auth_status(request: Request):

    try:
        require_session(request)

    except HTTPException:
        request.session.clear()

        return {
            "authenticated": False,
            "user": None
        }

    return {
        "authenticated": True,
        "user": request.session.get("github_user")
    }


@app.post("/auth/logout")
def logout(request: Request):
    session_id = request.session.get("session_id")
    TOKEN_STORE.pop(session_id, None)
    request.session.clear()

    return {"message": "Logged out successfully"}


@app.get("/github/repositories")
def github_repositories(request: Request):
    session = require_session(request)

    try:
        response = requests.get(
            "https://api.github.com/user/repos",
            headers={
                "Authorization": f"Bearer {session['token']}",
                "Accept": "application/vnd.github+json",
            },
            params={
                "per_page": 30,
                "sort": "updated",
                "visibility": "public",
            },
            timeout=15,
        )
        response.raise_for_status()

        return {
            "repositories": [
                {
                    "name": repo["name"],
                    "description": repo["description"],
                    "language": repo["language"],
                    "stars": repo["stargazers_count"],
                    "url": repo["html_url"],
                }
                for repo in response.json()
            ]
        }

    except requests.exceptions.RequestException:
        raise HTTPException(502, "GitHub API request failed")


@app.get("/mcp/tools")
async def get_mcp_tools(request: Request):
    require_session(request)

    try:
        tools = await list_mcp_tools()
        return {
            "count": len(tools),
            "tools": tools,
        }

    except Exception as exc:
        raise HTTPException(502, f"Unable to discover MCP tools: {exc}")


@app.post("/mcp/execute")
async def run_mcp_tool(payload: MCPToolRequest, request: Request):
    session = require_session(request)

    allowed_tools = {
    "get_repository",
    "list_repositories",
    "get_issues",
    "get_authenticated_user"
    }

    if payload.name not in allowed_tools:
        raise HTTPException(403, "Tool not allowed")

    start = time.perf_counter()

    try:
        result = await execute_mcp_tool(
            payload.name,
            payload.arguments,
            access_token=session["token"]
            )

        output = result.get("structured_content")
        if output is None:
            output = result.get("structuredContent")

        failed = bool(result.get("is_error") or result.get("isError"))

        if isinstance(output, dict):
            failed = failed or bool(output.get("error"))
            nested = output.get("result")
            if isinstance(nested, dict):
                failed = failed or bool(nested.get("error"))

        for item in result.get("content", []):
            if isinstance(item, dict):
                try:
                    parsed = json.loads(item.get("text", ""))
                    if isinstance(parsed, dict):
                        failed = failed or bool(parsed.get("error"))
                except (ValueError, TypeError):
                    pass

        duration = (time.perf_counter() - start) * 1000
        status = "Failed" if failed else "Success"
        record_activity(session, payload.name, status, duration)

        return {
            "tool": payload.name,
            "result": result,
        }

    except Exception as exc:
        duration = (time.perf_counter() - start) * 1000
        record_activity(session, payload.name, "Failed", duration)
        raise HTTPException(502, f"MCP tool execution failed: {exc}")


@app.get("/activity/logs")
def get_activity_logs(request: Request):
    session = require_session(request)
    logs = list(session.get("activity_logs", []))

    return {
        "total": len(logs),
        "successful": sum(log["status"] == "Success" for log in logs),
        "failed": sum(log["status"] == "Failed" for log in logs),
        "logs": logs,
    }

class AssistantRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000
    )


@app.post("/assistant/chat")
async def assistant_chat(
    payload: AssistantRequest,
    request: Request
):
    require_session(request)

    async def execute_and_log(name, arguments):

        response = await run_mcp_tool(
            MCPToolRequest(
                name=name,
                arguments=arguments
            ),
            request
        )

        return response["result"]

    try:
        return await ask_assistant(
            payload.question,
            execute_and_log
        )

    except Exception:
        raise HTTPException(
            502,
            "AI assistant service unavailable"
        )
