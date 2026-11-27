
from mcp.server import MCPServer
import github_connector as github

mcp = MCPServer("AI ConnectHub")


@mcp.tool()
def get_repository(owner: str, repo: str) -> dict:
    """Retrieve information about a public GitHub repository."""
    return github.get_repository(owner, repo)


@mcp.tool()
def list_repositories(username: str) -> dict:
    """List public repositories of a GitHub user."""

    result = github.list_repositories(username)

    if isinstance(result, dict):
        return result

    return {"repositories": result}


@mcp.tool()
def get_issues(owner: str, repo: str) -> dict:
    """Retrieve open issues from a public GitHub repository."""

    result = github.get_issues(owner, repo)

    if isinstance(result, dict):
        return result

    return {"issues": result}


@mcp.tool()
def get_authenticated_user() -> dict:
    """Retrieve the currently authenticated GitHub user."""
    return github.get_authenticated_user()


if __name__ == "__main__":
    mcp.run(transport="stdio")
