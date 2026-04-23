# 09 · MCP knowledge desk

An engineering onboarding agent whose entire toolbox comes from an
**external MCP server** — the official
`@modelcontextprotocol/server-filesystem`, scoped to this repository's
`docs/` directory. The agent has zero hand-written tools.

ADK primitive on show: **`MCPToolset`**. The same constructor shape
drops in any MCP server — GitHub, Playwright-MCP, Slack, Linear. We
use filesystem because it has the cleanest story: read a directory,
answer from it, cite the file.

---

## Prerequisites

- **Node / npx.** The MCP server is downloaded and run by `npx`.
- A `GOOGLE_API_KEY` or Vertex ADC.

---

## Run

```bash
cd code/agents/09-mcp-knowledge-desk
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GOOGLE_API_KEY
python server.py
```

Server listens on `http://127.0.0.1:8009`.

First run will be slow for a few seconds while `npx` downloads the
MCP server; subsequent runs are instant.

`MCP_ROOT` (default: `/home/…/Google-ADK-Cookbook/docs`) is the only
path the agent can see. The tool filter allows only read-only
operations — it can't create, move, or delete files.

---

## Prompts worth trying

> What chapters does the cookbook cover?

> Show me how the evaluation chapter sets up trajectory scoring.

> Where does the cookbook explain LoopAgent stopping conditions?

> Does the cookbook discuss running agents on Cloud Run?

The agent walks the tree, reads the file, answers with inline
citations. If the answer isn't in the docs, it says so.

---

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/health` | Liveness + `mcp_root`. |
| POST | `/session`, `/chat/{session_id}` | Standard. |
| GET | `/metrics`, `/introspect` | Standard. MCP tools show up with `fs_` prefix in introspect. |
