"""FastAPI bridge for the food delivery computer-use agent.

Hosts:
  - /dashboard/*     the mock merchant ops console the agent navigates.
  - /health          liveness.
  - POST /session    create a session.
  - POST /chat/{id}  SSE stream of text + tool calls + screenshots.

Screenshots from the computer-use toolset are surfaced to the portal
as base64 PNG frames inside the event stream, so the portal can render
a live "what the agent sees" pane alongside the chat.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from google.adk.runners import InMemoryRunner
from google.genai import types
from pydantic import BaseModel

load_dotenv()

from food_delivery_support import root_agent  # noqa: E402
from food_delivery_support.metrics import MetricsStore, TurnMetrics  # noqa: E402


APP_NAME = "food-delivery-support"
USER_ID = "customer"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Food delivery support", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Serve the mock merchant console the agent will navigate.
_DASHBOARD_DIR = Path(__file__).parent / "food_delivery_support" / "mock_dashboard"
app.mount("/dashboard", StaticFiles(directory=_DASHBOARD_DIR, html=True), name="dashboard")


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "dashboard": "/dashboard/",
    }


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics.snapshot()


@app.post("/session")
async def new_session() -> dict:
    session = await runner.session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID
    )
    return {"session_id": session.id}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


async def _stream(session_id: str, message: str) -> AsyncIterator[str]:
    new_message = types.Content(role="user", parts=[types.Part(text=message)])
    turn = TurnMetrics(model=root_agent.model)
    try:
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=new_message
        ):
            turn.record_usage(getattr(event, "usage_metadata", None))
            for part in (event.content.parts if event.content else []):
                if part.text:
                    turn.mark_first_token()
                    yield _sse({"kind": "text", "data": part.text})
                if part.function_call:
                    turn.record_tool_call()
                    yield _sse({
                        "kind": "tool_call",
                        "name": part.function_call.name,
                        "args": dict(part.function_call.args or {}),
                    })
                if part.function_response:
                    response = part.function_response.response
                    screenshot_b64 = None
                    if isinstance(response, dict):
                        for k in ("screenshot", "image"):
                            raw = response.get(k)
                            if isinstance(raw, (bytes, bytearray)):
                                screenshot_b64 = base64.b64encode(bytes(raw)).decode()
                                break
                    yield _sse({
                        "kind": "tool_result",
                        "name": part.function_response.name,
                        "screenshot": screenshot_b64,
                        "data": _compact(response),
                    })
            if getattr(event, "turn_complete", False):
                turn.finish()
                metrics.record(turn)
                yield _sse({"kind": "turn_complete", "metrics": turn.as_dict()})
    except Exception as e:
        turn.finish(error=str(e))
        metrics.record(turn)
        yield _sse({"kind": "error", "data": str(e), "metrics": turn.as_dict()})


def _compact(value):
    """Strip bytes from responses so the JSON payload stays small."""
    if isinstance(value, dict):
        return {
            k: ("<bytes>" if isinstance(v, (bytes, bytearray)) else _compact(v))
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_compact(v) for v in value]
    return value


@app.post("/chat/{session_id}")
async def chat(session_id: str, body: ChatInput) -> StreamingResponse:
    return StreamingResponse(
        _stream(session_id, body.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8004)))
