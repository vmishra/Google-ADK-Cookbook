# 04 · Food delivery support (computer-use)

A customer-support agent that mixes **structured tools** (look up an
order, issue a refund, dispatch a replacement driver) with
**computer-use**: a real Chromium browser, driven by the model,
navigating an internal merchant ops console.

The console it drives is a small static page bundled in this project
(`food_delivery_support/mock_dashboard/`). The FastAPI server mounts
it at `/dashboard/`. The agent navigates there on start-up and is
confined to that origin.

## What to notice

- **Two surfaces, one agent.** The model chooses: structured tool for
  a single, auditable action; browser for anything that ordinarily
  takes a support rep clicking through the internal dashboard.
- **Origin allowlist.** `before_tool_callback` refuses `navigate`
  calls outside `CU_ALLOWED_ORIGIN`.
- **Destructive-click gate.** Buttons whose label contains *cancel*,
  *delete*, or *deactivate* require an explicit approval flag in
  session state before the agent can click.
- **Screenshots in the stream.** The computer-use toolset returns
  screenshots on each turn; the server base64-encodes them into the
  SSE stream so the portal can render a live *"what the agent sees"*
  pane.

## Run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium           # one-time, ~180MB
cp .env.example .env                  # fill in GOOGLE_API_KEY
uvicorn server:app --reload --port 8004
```

The Chromium window opens on first turn. Set `HEADLESS=true` in your
`.env` to hide it.

## Endpoints

- `GET  /health`               — liveness.
- `GET  /dashboard/`           — the static mock console the agent uses.
- `POST /session`              — new session.
- `POST /chat/{session_id}`    — SSE stream (text, tool calls, screenshots).

## Prompts worth trying

- *"Order FD-71045 — the customer says it's 40 minutes late and the driver is not moving. Look at the dashboard and tell me what you'd do next."*
- *"The customer on FD-71023 wants ₹ 200 off for a missing item. Issue a partial refund."*
- *"Cancel FD-71078. The customer asked me to."*  (Agent should ask for explicit confirmation before clicking *Cancel order*.)

## Model note

`gemini-2.5-computer-use-preview-10-2025` is the current preview
model. It runs in AI Studio and Vertex. Swap `CU_MODEL` in `.env` if
Google rotates the preview tag.
