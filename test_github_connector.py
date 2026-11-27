from unittest.mock import patch, Mock
import requests
from github_connector import github_request

@patch("github_connector.requests.get")
def test_successful_request(mock_get):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {"name": "vscode"}
    mock_get.return_value = response

    result = github_request("repos/microsoft/vscode")

    assert result["name"] == "vscode"

@patch("github_connector.requests.get")
def test_repository_not_found(mock_get):
    mock_get.return_value.status_code = 404

    result = github_request("repos/test/invalid")

    assert result["error"] == "Resource not found"

@patch("github_connector.requests.get")
def test_rate_limit(mock_get):
    mock_get.return_value.status_code = 429

    result = github_request("repos/microsoft/vscode")

    assert result["error"] == "GitHub API rate limit exceeded"

@patch("github_connector.time.sleep")
@patch("github_connector.requests.get")
def test_connection_failure(mock_get, mock_sleep):
    mock_get.side_effect = requests.exceptions.ConnectionError

    result = github_request("repos/microsoft/vscode")

    assert result["error"] == "Maximum retries exceeded"
    assert mock_get.call_count == 3
    assert mock_sleep.call_count == 2