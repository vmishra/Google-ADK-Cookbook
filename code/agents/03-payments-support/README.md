# 03 · Payments voice support

A voice support agent for a payments company. Native-audio
speech-to-speech via Gemini Live. Tool-calling works mid-conversation —
the agent looks up a transaction, reads the merchant and amount back
aloud, and initiates the refund without ever leaving the audio turn.

## What to notice

- **Native audio, not ASR+TTS.** The Live model speaks and listens
  directly. There is no separate speech-to-text step; transcripts are
  a side-channel for the portal to display.
- **Tool calls inside a voice turn.** `lookup_transaction`,
  `initiate_refund`, `file_dispute`, `block_card`, `case_summary` —
  all invoked while audio is streaming.
- **Session resumption.** `RunConfig(session_resumption=...)` lets a
  dropped socket reconnect to the same live session without losing
  context.
- **Voice selection.** `Aoede` by default (calm, measured). Override
  with `VOICE_NAME=Puck` etc.

## Run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # fill in GOOGLE_API_KEY
uvicorn server:app --reload --port 8003
```

Endpoints:

- `GET  /health` — liveness.
- `WS   /ws`     — single bidirectional WebSocket. The portal connects,
                   microphone audio flows in as PCM16/16k base64, the
                   agent's audio replies come back as PCM16/24k base64,
                   with transcripts + tool calls as side-channel JSON.

## Wire format

Inbound JSON (browser → server):

```json
{"kind": "audio", "data": "<base64 pcm16 @ 16000 Hz>"}
{"kind": "text",  "data": "Hello"}      // typed override
{"kind": "end"}                          // close
```

Outbound JSON (server → browser):

```json
{"kind": "session", "session_id": "…"}
{"kind": "audio", "data": "<base64 pcm16 @ 24000 Hz>"}
{"kind": "transcript", "role": "user"|"model", "data": "…"}
{"kind": "tool_call", "name": "lookup_transaction", "args": {...}}
{"kind": "tool_result", "name": "lookup_transaction", "data": {...}}
{"kind": "turn_complete"}
```

## Scripts worth trying

The portal's voice panel can speak into the mic. Scenarios:

- *"Hi, I see a charge I don't recognise. Reference TXN-PF-9921, Swiggy, this morning."*
- *"I lost my card last night. The last four are 4412."*
- *"The product never arrived. Can you file a dispute? Reference TXN-AM-7734."*

The agent will confirm the transaction facts back, ask for what it
needs, and read confirmation IDs digit-by-digit.

## Model note

Defaults to `gemini-3.1-flash-live-preview` — the 3.1-family native
audio model currently in preview. If that is not enabled on your
project, swap `VOICE_MODEL` to `gemini-live-2.5-flash-native-audio`
(Vertex GA). No other code changes required.
