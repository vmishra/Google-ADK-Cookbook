"""WebSocket bridge for the payments voice agent.

Bridges a browser microphone / speaker to Gemini Live via ADK's
`run_live()`. Audio format on the wire:

  browser → server   PCM16 @ 16 kHz, little-endian, raw bytes
  server  → browser  PCM16 @ 24 kHz, raw bytes (base64 over JSON)

Message protocol (JSON) the portal speaks to us:

  {"kind": "audio",  "data": "<base64 pcm16 @ 16k>"}
  {"kind": "text",   "data": "..."}                       # typed override
  {"kind": "end"}                                          # close session

And we emit:

  {"kind": "audio",      "data": "<base64 pcm16 @ 24k>"}
  {"kind": "transcript", "role": "user"|"model", "data": "..."}
  {"kind": "tool_call",  "name": "...", "args": {...}}
  {"kind": "tool_result","name": "...", "data": ...}
  {"kind": "turn_complete"}
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import InMemoryRunner
from google.genai import types

load_dotenv()

_has_key = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
_use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in {"1", "true", "yes"}
if not (_has_key or _use_vertex):
    print(
        "[payments-support] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY and "
        "GOOGLE_GENAI_USE_VERTEXAI not true. Voice calls will fail.", flush=True,
    )
else:
    print(f"[payments-support] auth ok · vertex={_use_vertex} · api_key={'set' if _has_key else 'unset'}", flush=True)

from payments_support import root_agent  # noqa: E402
from payments_support.metrics import MetricsStore, TurnMetrics  # noqa: E402
from payments_support.introspect import introspect  # noqa: E402


APP_NAME = "payments-voice"
USER_ID = "caller"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Payments voice support", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "modality": "voice (bidirectional)",
    }


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics.snapshot()


@app.post("/metrics/reset")
async def reset_metrics() -> dict:
    # Called by the portal on page mount so the top ribbon never shows
    # aggregates carried over from a previous browser session.
    metrics.reset()
    return {"ok": True}


@app.get("/introspect")
async def get_introspect() -> dict:
    return introspect(root_agent)


def _run_config() -> RunConfig:
    """Configure Live for a support-agent workload.

    - AUDIO out with transcripts surfaced on both sides.
    - Session resumption so a dropped socket can reconnect.
    - Context-window compression so long support calls (a caller
      narrating a dispute, an agent reading back a case history)
      do not blow out the model's window. Triggers at ~100k tokens
      and compresses to a ~50k sliding window, matching Google's
      recommended defaults for the Live API.
    - A calm, measured voice. Override via env.
    """
    voice_name = os.environ.get("VOICE_NAME", "Kore")
    trigger = int(os.environ.get("LIVE_COMPRESSION_TRIGGER_TOKENS", "104857"))
    target = int(os.environ.get("LIVE_COMPRESSION_TARGET_TOKENS", "52428"))
    return RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        ),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        context_window_compression=types.ContextWindowCompressionConfig(
            trigger_tokens=trigger,
            sliding_window=types.SlidingWindow(target_tokens=target),
        ),
    )


async def _forward_browser_to_model(ws: WebSocket, queue: LiveRequestQueue) -> None:
    """Read JSON messages from the browser, push into the live queue."""
    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("kind")
            if kind == "audio":
                pcm = base64.b64decode(msg["data"])
                queue.send_realtime(types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=pcm,
                ))
            elif kind == "text":
                queue.send_content(types.Content(
                    role="user", parts=[types.Part(text=msg["data"])]
                ))
            elif kind == "end":
                queue.close()
                return
    except WebSocketDisconnect:
        queue.close()


async def _forward_model_to_browser(
    ws: WebSocket, session_id: str, queue: LiveRequestQueue
) -> None:
    """Read events from run_live, render them to the portal."""
    turn = TurnMetrics(model=root_agent.model)
    try:
        async for event in runner.run_live(
            user_id=USER_ID,
            session_id=session_id,
            live_request_queue=queue,
            run_config=_run_config(),
        ):
            turn.record_usage(event)
            turn.record_event_signals(event)
            for part in (event.content.parts if event.content else []):
                if part.inline_data and part.inline_data.data:
                    turn.mark_first_token()
                    await ws.send_json({
                        "kind": "audio",
                        "data": base64.b64encode(part.inline_data.data).decode(),
                    })
                if part.text:
                    turn.mark_first_token()
                    await ws.send_json({
                        "kind": "transcript",
                        "role": event.content.role or "model",
                        "data": part.text,
                    })
                if part.function_call:
                    turn.record_tool_call()
                    await ws.send_json({
                        "kind": "tool_call",
                        "name": part.function_call.name,
                        "args": dict(part.function_call.args or {}),
                    })
                if part.function_response:
                    await ws.send_json({
                        "kind": "tool_result",
                        "name": part.function_response.name,
                        "data": _jsonable(part.function_response.response),
                    })
            # If Gemini decided the user barged in, tell the client so
            # it can drain any scheduled PCM sources — otherwise the old
            # reply keeps playing under the new one.
            if getattr(event, "interrupted", False):
                await ws.send_json({"kind": "interrupted"})
            # Live metric tick every event so the browser ribbon ticks.
            await ws.send_json({
                "kind": "metrics_tick",
                "metrics": turn.as_dict(),
            })
            if getattr(event, "turn_complete", False):
                turn.finish()
                metrics.record(turn)
                await ws.send_json({
                    "kind": "turn_complete",
                    "metrics": turn.as_dict(),
                })
                # Next turn in the same live session gets its own metric.
                turn = TurnMetrics(model=root_agent.model)
    except WebSocketDisconnect:
        return


def _jsonable(value: Any) -> Any:
    """ADK function responses arrive as dict-like. Make them JSON-safe."""
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    session = await runner.session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID
    )
    await ws.send_json({"kind": "session", "session_id": session.id})
    queue = LiveRequestQueue()
    await asyncio.gather(
        _forward_browser_to_model(ws, queue),
        _forward_model_to_browser(ws, session.id, queue),
        return_exceptions=True,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8003)))
