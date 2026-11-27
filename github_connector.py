
import os
import re
import requests
import time
import logging

BASE_URL = "https://api.github.com"

HEADERS = {
    "Accept": "application/vnd.github+json"
}

MAX_RETRIES = 3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def valid_name(value):
    return (
        isinstance(value, str)
        and value not in {".", ".."}
        and re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", value)
        is not None
    )


def github_request(endpoint, params=None):

    headers = HEADERS.copy()

    token = os.getenv("GITHUB_ACCESS_TOKEN")

    if token:
        headers["Authorization"] = f"Bearer {token}"

    for attempt in range(MAX_RETRIES):

        try:
            response = requests.get(
                f"{BASE_URL}/{endpoint}",
                headers=headers,
                params=params,
                timeout=15,
                allow_redirects=False
            )

            if 300 <= response.status_code < 400:
                return {"error": "Unexpected API redirect"}

            if response.status_code == 404:
                return {"error": "Resource not found"}

            if response.status_code == 401:
                return {"error": "Authentication failed"}

            if response.status_code == 429 or (
                response.status_code == 403
                and (
                    response.headers.get(
                        "X-RateLimit-Remaining"
                    ) == "0"
                    or "Retry-After" in response.headers
                )
            ):
                return {
                    "error": "GitHub API rate limit exceeded"
                }

            if response.status_code == 403:
                return {"error": "Access forbidden"}

            if response.status_code >= 500:
                logger.warning("GitHub service failure")

                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
                    continue

                return {
                    "error": "GitHub service unavailable"
                }

            response.raise_for_status()

            logger.info(
                "GitHub API request successful (%s)",
                "delegated" if token else "anonymous"
            )

            return response.json()

        except (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError
        ):
            logger.warning("Connection failed")

            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)

        except requests.exceptions.RequestException:
            return {"error": "GitHub API request failed"}

    return {"error": "Maximum retries exceeded"}


def get_repository(owner, repo):

    if not valid_name(owner) or not valid_name(repo):
        return {"error": "Invalid repository parameters"}

    data = github_request(f"repos/{owner}/{repo}")

    if "error" in data:
        return data

    if data.get("private") is not False:
        return {"error": "Only public repositories allowed"}

    return {
        "name": data["full_name"],
        "description": data["description"],
        "language": data["language"],
        "stars": data["stargazers_count"],
        "forks": data["forks_count"],
        "url": data["html_url"]
    }


def list_repositories(username):

    if not valid_name(username):
        return {"error": "Invalid username"}

    data = github_request(
        f"users/{username}/repos",
        {
            "per_page": 10,
            "sort": "updated",
            "type": "owner"
        }
    )

    if isinstance(data, dict):
        return data

    return [
        {
            "name": repo["name"],
            "language": repo["language"],
            "url": repo["html_url"]
        }
        for repo in data
        if repo.get("private") is False
    ]


def get_issues(owner, repo):

    if not valid_name(owner) or not valid_name(repo):
        return {"error": "Invalid repository parameters"}

    repository = get_repository(owner, repo)

    if "error" in repository:
        return repository

    data = github_request(
        f"repos/{owner}/{repo}/issues",
        {
            "state": "open",
            "per_page": 30
        }
    )

    if isinstance(data, dict):
        return data

    return [
        {
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "url": issue["html_url"]
        }
        for issue in data
        if "pull_request" not in issue
    ][:10]


def get_authenticated_user():

    if not os.getenv("GITHUB_ACCESS_TOKEN"):
        return {"error": "Delegated authentication required"}

    data = github_request("user")

    if "error" in data:
        return data

    return {
        "username": data["login"],
        "name": data.get("name") or data["login"],
        "authentication": "Delegated OAuth 2.0"
    }
