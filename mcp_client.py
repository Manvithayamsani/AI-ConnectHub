
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER_PATH = Path(__file__).resolve().parent / "server.py"


def create_server_params(access_token=None):

    environment = {
        "GITHUB_ACCESS_TOKEN": access_token or ""
    }

    return StdioServerParameters(
        command=sys.executable,
        args=[str(SERVER_PATH)],
        env=environment
    )


async def list_mcp_tools():

    server_params = create_server_params()

    async with stdio_client(server_params) as (
        read, write
    ):
        async with ClientSession(read, write) as session:

            await session.initialize()

            result = await session.list_tools()

            return [
                tool.model_dump(mode="json")
                for tool in result.tools
            ]


async def execute_mcp_tool(
    name,
    arguments,
    access_token=None
):

    server_params = create_server_params(access_token)

    async with stdio_client(server_params) as (
        read, write
    ):
        async with ClientSession(read, write) as session:

            await session.initialize()

            result = await session.call_tool(
                name,
                arguments
            )

            return result.model_dump(mode="json")
