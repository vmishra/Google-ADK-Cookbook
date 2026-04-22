"""Notion-backed assistant using MCP over stdio."""
import json
import os

from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import (
    MCPToolset, StdioServerParameters)


NOTION_HEADERS = json.dumps({
    "Authorization": f"Bearer {os.environ.get('NOTION_TOKEN', '')}",
    "Notion-Version": "2022-06-28",
})


root_agent = LlmAgent(
    name="notion_agent",
    model="gemini-3.1-flash",
    description="Reads and writes to your Notion workspace.",
    instruction=(
        "You help manage the user's Notion workspace. "
        "Use the Notion tools to search pages, read content, and create "
        "new pages when asked. Confirm before creating."),
    tools=[MCPToolset(connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@notionhq/notion-mcp-server"],
        env={"OPENAPI_MCP_HEADERS": NOTION_HEADERS}))],
)
