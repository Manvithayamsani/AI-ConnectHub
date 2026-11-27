import asyncio
import json

from mcp_client import list_mcp_tools

async def main():
    tools = await list_mcp_tools()
    print(json.dumps(tools, indent=2))

if __name__ == "__main__":
    asyncio.run(main())