# ADK, in practice

Four production-shaped agents built on Google ADK (Agent Development Kit,
Python) and a single portal that lets you open each one, explain what it
does, and talk to it in the browser. Meant to be the *code* counterpart to
the cookbook — something an architect can load in an IDE, run, and demo
to a customer inside an hour.

## What is here

```
code/
  portal/                             The exhibit. Lists agents, lets you launch each.
  agents/
    01-concierge                      Luxury hotel concierge. LlmAgent + mocked tools.
    02-travel-planner                 Deep-research planner. Sequential + parallel sub-agents.
    03-payments-support               Voice support for a payments company. Gemini Live.
    04-food-delivery-support          Computer-use support agent against a mock dashboard.
  scripts/dev-all.sh                  Start every server + the portal.
```

Each agent folder is a standalone Python project with its own
`requirements.txt`, `.env.example`, and `server.py`. You can open just one
and run it. The portal is separate — it is a static site that points at
each agent's local port.

| # | Agent | Pattern | Port |
|---|---|---|---|
| 01 | Concierge | `LlmAgent` with a toolbox | 8001 |
| 02 | Travel planner | `SequentialAgent` wrapping a `ParallelAgent` | 8002 |
| 03 | Payments voice support | `run_live()` over WebSocket | 8003 |
| 04 | Food delivery support | Computer-use via `ComputerUseToolset` | 8004 |
| — | Portal | Vite + React, DESIGN.md tokens | 5174 |

## Before you run

You need a Gemini API key. Either route works — the agents do not care.

```bash
# Option 1. AI Studio (simpler, no Cloud setup).
export GOOGLE_API_KEY=...

# Option 2. Vertex on Google Cloud (if your workshop runs against Vertex).
gcloud auth application-default login
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
```

A `.env.example` inside each agent folder documents the variables it
reads. Copy it to `.env`, fill in the key, and the server picks it up.

Models used across the bundle (April 2026):

- `gemini-3.1-flash` — primary reasoning.
- `gemini-3.1-flash-lite` — cheaper sub-agents in the planner.
- `gemini-3.1-flash-live` — native-audio voice (agent 03).
- `gemini-2.5-computer-use-preview-10-2025` — browser control (agent 04).

Every model ID is overridable via the agent's `.env` in case Google ships
a rename while the workshop is live. See each agent's README.

## Run one agent

```bash
cd agents/01-concierge
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                  # add your key
uvicorn server:app --reload --port 8001
```

Visit `http://localhost:8001/docs` for the OpenAPI console, or use the
portal (next section) for the chat surface.

## Run the portal

```bash
cd portal
npm install
npm run dev                           # http://localhost:5174
```

The portal assumes each agent is running on the ports listed above. If
none of them are up, the cards still render — the chat panel on each
page surfaces a calm *"agent is offline"* state rather than an error.

## Run everything at once

```bash
./scripts/workshop-up.sh
```

Starts the four agent servers and the portal in one shot. Each process
writes to its own log under `.logs/` inside the repo. `Ctrl-C` tears
them all down together.

## Design

The portal follows the project design system verbatim —
`/Users/vikas/Desktop/Project/Agentic-Concierge/DESIGN.md`. Dark-first,
OKLCH tokens, Geist + Fraunces italic for editorial moments, Geist Mono
for numerals, one champagne accent, spring motion, no emoji, no
exclamation marks, progressive disclosure.

## License

Same as the parent repo: Apache 2.0.
