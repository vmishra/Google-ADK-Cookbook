"""FastAPI bridge for the concierge agent.

Exposes three endpoints:

- GET  /health           a trivial liveness check for the portal.
- POST /session          create a new session, return its id.
- POST /chat/{session}   send a user message, receive SSE stream of
                         agent text, tool calls, and turn_complete.

We keep the server minimal so the portal can stay thin. The agent
itself lives in concierge.agent and is modelled exactly the way
google/adk-samples lays out a package: `root_agent` at module top.
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google.adk.runners import InMemoryRunner
from google.genai import types
from pydantic import BaseModel

load_dotenv()  # reads .env in the working dir before the agent imports

_has_key = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
_use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in {"1", "true", "yes"}
if not (_has_key or _use_vertex):
    print(
        "[concierge] WARNING: no GOOGLE_API_KEY or GEMINI_API_KEY set and "
        "GOOGLE_GENAI_USE_VERTEXAI is not true. Chat requests will fail "
        "with an auth error. Set the key in .env or export it before "
        "starting the server.",
        flush=True,
    )
else:
    print(f"[concierge] auth ok · vertex={_use_vertex} · api_key={'set' if _has_key else 'unset'}", flush=True)

from concierge import root_agent  # noqa: E402
from concierge.metrics import MetricsStore, TurnMetrics  # noqa: E402


APP_NAME = "concierge"
USER_ID = "guest"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()

app = FastAPI(title="Concierge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "tool_count": len(root_agent.tools or []),
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


async def _stream(session_id: str, message: str) -> AsyncIterator[str]:
    """Iterate the agent's events and emit SSE frames the portal understands.

    Frame shapes:
      {"kind": "text",          "data": "..."}       partial tokens
      {"kind": "tool_call",     "name": "...",
                                "args": {...}}      model wants to call a tool
      {"kind": "tool_result",   "name": "...",
                                "data": ...}        tool returned
      {"kind": "turn_complete"}
      {"kind": "error",         "data": "..."}
    """
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
                    yield _sse({
                        "kind": "tool_result",
                        "name": part.function_response.name,
                        "data": part.function_response.response,
                    })
            if getattr(event, "turn_complete", False):
                turn.finish()
                metrics.record(turn)
                yield _sse({"kind": "turn_complete", "metrics": turn.as_dict()})
    except Exception as e:  # surface a calm error to the client
        turn.finish(error=str(e))
        metrics.record(turn)
        yield _sse({"kind": "error", "data": str(e), "metrics": turn.as_dict()})


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@app.post("/chat/{session_id}")
async def chat(session_id: str, body: ChatInput) -> StreamingResponse:
    return StreamingResponse(
        _stream(session_id, body.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":  # convenience: `python server.py`
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8001)))
