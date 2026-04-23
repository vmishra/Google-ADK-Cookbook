# 10 · Live video field service coach

A field-service technician points their phone camera at an
appliance; the coach watches the stream, names the fault, and pulls
the right spare. Uses **Gemini Live with video input** — the
follow-on to the voice agent in chapter 03, but with `run_live()`
consuming JPEG frames instead of PCM audio.

ADK primitive on show: **`run_live()` + `LiveRequestQueue` with
`image/jpeg` Blob frames** and TEXT response modality. Captions
land in the portal under the live video preview at ~1 fps.

---

## Run

```bash
cd code/agents/10-live-video-coach
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GOOGLE_API_KEY
python server.py
```

Server listens on `http://127.0.0.1:8010` with a WebSocket at
`ws://127.0.0.1:8010/ws`.

In the portal, the page asks for camera permission, captures a
frame every second, base64-encodes it, and sends it down the socket.

---

## Prompts worth trying

> (point camera at an AC rating plate) — read the model and tell
> me the common faults.

> (point camera at a leaking washing-machine door) — what's
> wrong, and what spare do I need?

> (point camera at a fridge with ice on the back wall) — walk me
> through the check.

You can also type text into the composer and the coach will
combine it with the current frame.

---

## Wire protocol

Browser → server (JSON over WS):

| `kind` | fields | |
|---|---|---|
| `video` | `data` (base64 JPEG) | one frame |
| `text` | `data` (string) | typed override |
| `end` | — | close session |

Server → browser:

| `kind` | fields |
|---|---|
| `session` | `session_id` |
| `transcript` | `role`, `data` |
| `tool_call` / `tool_result` | standard |
| `metrics_tick` / `turn_complete` | `metrics` |
| `error` | `data` |

---

## Endpoints

| Method | Path | |
|---|---|---|
| WS | `/ws` | Bidirectional live session. |
| GET | `/health`, `/metrics`, `/introspect` | Standard. |
