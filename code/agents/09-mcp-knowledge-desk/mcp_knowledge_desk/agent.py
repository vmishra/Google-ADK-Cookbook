"""Engineering onboarding agent — the MCP showcase.

The agent has zero hand-written tools. Every tool it calls comes
from an external MCP server (the official filesystem MCP from
@modelcontextprotocol) scoped to this repository's `docs/` directory.

The point: ADK plugs into any MCP server with `MCPToolset`. The
filesystem server is the most common, but the same constructor
shape drops in GitHub, Playwright-MCP, Slack, Linear, whatever.

Requires Node (for `npx`). First run downloads the MCP server.
"""
from __future__ import annotations

import os
from pathlib import Path

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.adk.tools.mcp_tool import MCPToolset, StdioConnectionParams
from google.genai import types as genai_types
from mcp import StdioServerParameters


MODEL = os.environ.get("MCP_KNOWLEDGE_MODEL", "gemini-3-flash-preview")


# Scope the filesystem MCP server to the repo's documentation tree so
# the agent can walk chapters, cheatsheets, and patterns, but cannot
# reach the rest of the filesystem. Override with MCP_ROOT if you
# want to point it elsewhere.
_DEFAULT_ROOT = str(
    (Path(__file__).resolve().parents[3] / "docs").resolve()
)
MCP_ROOT = os.environ.get("MCP_ROOT", _DEFAULT_ROOT)


def build_filesystem_toolset() -> MCPToolset:
    """Boot an `@modelcontextprotocol/server-filesystem` over stdio."""
    return MCPToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command="npx",
                args=["-y", "@modelcontextprotocol/server-filesystem", MCP_ROOT],
            ),
            timeout=30.0,
        ),
        # Read-only selection — the agent should never mutate the repo.
        tool_filter=[
            "read_file",
            "read_text_file",
            "list_directory",
            "list_allowed_directories",
            "search_files",
            "directory_tree",
            "get_file_info",
        ],
        tool_name_prefix="fs",
    )


INSTRUCTION = """\
You are the engineering onboarding desk for the Google ADK Cookbook.
You answer questions about the cookbook's content — chapters,
patterns, cheatsheets — by reading files from the documentation tree
through a filesystem MCP server. You never guess: if the answer
isn't in the docs, you say so.

**Scope — what you decline.** You only handle cookbook questions.
If someone asks for code review of their own project, a general
programming question unrelated to ADK, or anything outside the
docs, reply with one short redirect line and call no tools.

  User: "Explain how Kubernetes services work."
  You:  "Outside my brief — I only answer from the ADK cookbook
         docs. Happy to point at the deployment chapter if that
         helps."

**How you work.**

1. **Start with structure.** On a broad question, call `fs_directory_tree`
   or `fs_list_directory` at the root to see the chapter layout.
   Don't dump the tree; pick the two or three directories that
   obviously match.

2. **Read narrowly.** Prefer `fs_read_text_file` on a single
   relevant file over reading many. Quote the minimum you need.

3. **Cite.** Every substantive claim cites the file it came from,
   as a path relative to the docs root, in backticks. Do not cite
   a file you did not actually read.

4. **Admit gaps.** If the docs don't answer the question, say so
   plainly and suggest the closest chapter.

Tone anchors: point, cite, quote, summarise. No filler. Prefer
concrete line references over paraphrase. Two to five short
paragraphs per answer.
"""


def build_agent() -> LlmAgent:
    return LlmAgent(
        name="mcp_knowledge_desk",
        model=MODEL,
        description=(
            "Engineering onboarding agent — answers from the cookbook "
            "docs via an external filesystem MCP server, with file "
            "citations."
        ),
        instruction=INSTRUCTION,
        planner=BuiltInPlanner(
            thinking_config=genai_types.ThinkingConfig(
                thinking_level=genai_types.ThinkingLevel.LOW,
            ),
        ),
        tools=[build_filesystem_toolset()],
    )


root_agent = build_agent()
