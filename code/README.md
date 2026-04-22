# ADK · reference

Five production-shaped agents built on Google ADK (Agent Development
Kit, Python), each landing on one canonical ADK pattern, with a single
portal that lists them and lets you open, inspect, and talk to each one
in the browser. A reference implementation for engineers and
architects evaluating ADK against other frameworks — runnable end to
end inside an hour on a laptop.

## What is here

```
code/
  portal/                             The console. Indexes the agents, live /health, telemetry.
  agents/
    01-concierge                      Canonical LlmAgent — one agent, eight tools.
    02-travel-planner                 Sequential deep-research pipeline with parallel researchers.
    03-payments-support               Native-audio voice line. Gemini Live, WebSocket.
    04-food-delivery-support          Computer-use on a mock merchant console. Playwright-backed.
    05-beauty-advisor                 Three-tier hierarchy with skills, memory, shared context.
  scripts/up.sh                       Start every server + the portal.
```

Each agent folder is a standalone Python project with its own
`requirements.txt`, `.env.example`, and `server.py`. You can open just
one and run it. The portal is a separate Vite + React app that points
at each agent's local port.

| # | Agent | Pattern | Port |
|---|---|---|---|
| 01 | Concierge | `LlmAgent` with a toolbox | 8001 |
| 02 | Travel planner | `SequentialAgent` wrapping a `ParallelAgent` | 8002 |
| 03 | Payments voice support | `run_live()` over WebSocket | 8003 |
| 04 | Food delivery support | Computer-use via `ComputerUseToolset` | 8004 |
| 05 | Beauty advisor | root → coordinators → specialists, skills, memory | 8005 |
| — | Portal | Vite + React, DESIGN.md tokens | 5174 |

## Before you run

You need a Gemini API key. Either route works — the agents do not care.

```bash
# AI Studio (simpler, no Cloud setup).
export GOOGLE_API_KEY=...

# Vertex AI on Google Cloud.
gcloud auth application-default login
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
```

A `.env.example` inside each agent folder documents the variables it
reads. Copy it to `.env`, fill in the key, and the server picks it up.

Models used across the stack (April 2026):

- `gemini-3.1-flash` — primary reasoning on agents 01, 02, 05.
- `gemini-3.1-flash-lite` — cheaper sub-agents in the planner and
  the beauty advisor's specialists.
- `gemini-live-2.5-flash-native-audio` — native-audio voice (agent 03).
  *Gemini 3.1 Flash Live is not yet public; swap `VOICE_MODEL` in
  `.env` once it ships.*
- `gemini-2.5-computer-use-preview-10-2025` — browser control (agent 04).

Every model ID is overridable via the agent's `.env`.

## Run one agent

```bash
cd agents/01-concierge
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                  # add your key
uvicorn server:app --reload --port 8001
```

Visit `http://localhost:8001/docs` for the OpenAPI console, or open
the portal for the chat surface.

## Run the portal

```bash
cd portal
npm install
npm run dev                           # http://localhost:5174
```

The portal polls each agent's `/health` every few seconds; whichever
servers are up show as `online` in the index, the rest show as
`offline` — no errors, just a calm signal.

## Run everything at once

```bash
./scripts/up.sh
```

Starts the five agent servers and the portal in one shot. Each process
has its own process group, so `Ctrl-C` tears down the whole tree —
including the python children. Each process writes to its own log
under `.logs/`. The script refuses to start if any of the target
ports are already bound (stops you from attaching to stale servers
from a previous run).

## Telemetry

Every agent server exposes `GET /metrics` — a ring of the last fifty
turns and an aggregate summary (p50/p95 TTFT, p50/p95 latency, input
and output tokens, tool calls, estimated cost in INR). The portal
reads this into a live ribbon at the top of each agent page and also
shows per-turn metrics inline on the `turn_complete` frame.

## Design

The portal follows the project design system verbatim —
`/Users/vikas/Desktop/Project/Agentic-Concierge/DESIGN.md`. OKLCH
tokens with a sibling light + dark palette (light is the default;
toggle in the top bar). Geist for UI, Fraunces italic reserved for
editorial moments, Geist Mono for numerals. One champagne accent,
spring motion, no emoji, no exclamation marks.

## License

Same as the parent repo: Apache 2.0.
