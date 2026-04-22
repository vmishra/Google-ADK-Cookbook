# 01 · Concierge

The canonical *one agent, many tools* pattern. A heritage-hotel
concierge that holds rooms, books dining, surfaces amenities, and
recommends local experiences. Tool selection, conversation memory,
and tone are all the model's job; the tools themselves are mocked
with realistic fixtures.

## What to notice

- **Shape.** `concierge/agent.py` exports a module-level `root_agent`,
  following the google/adk-samples convention.
- **Tools.** Bare Python functions with typed args and docstrings —
  no `FunctionTool` wrapper. The docstring is the description the
  model reads.
- **Session state.** `reserve_room` and `book_restaurant` write into
  `tool_context.state`; `current_holds` reads it back. This is how
  the agent answers *"what have I held so far?"* without the user
  re-listing.
- **Tone.** The system prompt is a short style guide: specific,
  observational, anticipatory — lifted from the project design
  system. Anti-cheerleading.

## Run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # fill in GOOGLE_API_KEY
uvicorn server:app --reload --port 8001
```

Endpoints:

- `GET  /health` — returns `{ok, agent, model, tool_count}`.
- `POST /session` — returns a fresh `session_id`.
- `POST /chat/{session_id}` — streams SSE events. Body:
  `{"message": "..."}`.

## Try it

From the portal (`http://127.0.0.1:5174/agents/concierge`) or with curl:

```bash
SID=$(curl -s -X POST http://127.0.0.1:8001/session | jq -r .session_id)
curl -N -X POST http://127.0.0.1:8001/chat/$SID \
  -H 'content-type: application/json' \
  -d '{"message": "Two nights, a heritage suite, Nov 12-14, for Mr Rao."}'
```

## Prompts worth trying

- *"Surface a heritage suite for three nights from 8 November, guest is Ananya Rao. Secure it if available."*
- *"Could you arrange dinner for four at Seto on Friday at 8:30? Under Mr Rao."*
- *"An early-morning running route and a café nearby for coffee after."*
- *"What's on my slate right now?"*
