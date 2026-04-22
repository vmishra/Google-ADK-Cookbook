# MCP interop

<span class="kicker">ch 16 · page 1 of 3</span>

MCP is the open standard for tool servers. ADK consumes any MCP
server and can itself expose tools as one. Either direction is a
one-file change.

---

## Consuming an MCP server

Covered in depth in [Chapter 4 — MCP tools](../04-tools/mcp-tools.md).
Quick recap:

```python
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

slack = MCPToolset(connection_params=StdioServerParameters(
    command="npx", args=["-y", "@slack/mcp-server"],
    env={"SLACK_TOKEN": os.environ["SLACK_TOKEN"]}))

agent = LlmAgent(tools=[slack], ...)
```

## Exposing an ADK agent's tools as MCP

Sometimes you want a non-ADK consumer (a Claude-based assistant, a
LangGraph workflow) to use tools your ADK team already wrote. Wrap
them in an MCP server.

```python
# serve_mcp.py
from mcp.server.fastmcp import FastMCP
from my_tools import lookup_invoice, mark_paid

mcp = FastMCP("billing")
mcp.tool()(lookup_invoice)
mcp.tool()(mark_paid)

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

Consumers point their MCP client at `python serve_mcp.py`.

## Auth

For remote MCP servers, the `MCPToolset` supports:

- Static headers (API keys, bearer tokens).
- Dynamic headers (a callable that reads from state).
- Service-account auth (for GCP-native MCP servers).
- Server-side sampling (MCP servers that call the model themselves).

See the six `mcp_*` samples in `google/adk-python` for each.

## When to prefer MCP over a function tool

- You want the same tool available to multiple agents, possibly in
  different frameworks.
- The tool already has an MCP implementation from the vendor.
- You need isolation — MCP servers run as subprocesses or remotes,
  so a misbehaving tool cannot corrupt the agent's process.

## When not to

- The tool is a simple function with no external dependency. Adding
  an MCP server is overhead.
- The tool needs deep access to session state. MCP tools get an
  opaque handle, not the full `ToolContext`.
