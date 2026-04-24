"""WebSocket bridge for the live video coach.

Wire protocol (JSON) the browser speaks:

  {"kind": "video", "data": "<base64 JPEG frame>"}   one frame (~1fps)
  {"kind": "text",  "data": "..."}                    typed question
  {"kind": "end"}                                     close session

Emitted to the browser:

  {"kind": "transcript", "role": "model"|"user", "data": "..."}
  {"kind": "tool_call",  "name": "...", "args": {...}}
  {"kind": "tool_result","name": "...", "data": ...}
  {"kind": "metrics_tick", "metrics": {...}}
  {"kind": "turn_complete", "metrics": {...}}
  {"kind": "session", "session_id": "..."}
  {"kind": "error", "data": "..."}
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
        "[card-scanner] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY. "
        "Live video will fail.",
        flush=True,
    )
else:
    print(f"[card-scanner] auth ok · vertex={_use_vertex}", flush=True)

from card_scanner import root_agent  # noqa: E402
from card_scanner.metrics import MetricsStore, TurnMetrics  # noqa: E402
from card_scanner.introspect import introspect  # noqa: E402


APP_NAME = "video-card-scanner"
USER_ID = "cardholder"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Live card scanner", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "modality": "video (live) + text",
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
    """TEXT response modality — captions only, no audio.

    Session resumption so a flaky field network can reconnect, and
    context-window compression so long call narrations don't blow
    out the live window.
    """
    trigger = int(os.environ.get("LIVE_COMPRESSION_TRIGGER_TOKENS", "104857"))
    target = int(os.environ.get("LIVE_COMPRESSION_TARGET_TOKENS", "52428"))
    return RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["TEXT"],
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
            if kind == "video":
                # base64 JPEG frame captured by the browser canvas at ~1fps.
                jpg = base64.b64decode(msg["data"])
                queue.send_realtime(types.Blob(
                    mime_type="image/jpeg",
                    data=jpg,
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
                turn = TurnMetrics(model=root_agent.model)
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await ws.send_json({"kind": "error", "data": str(e)})
        except Exception:
            pass


def _jsonable(value: Any) -> Any:
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
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8010)))
