"""FastAPI bridge for the travel-planner pipeline.

Same shape as the concierge server, but the agent here is a
SequentialAgent over three phases. The portal renders a timeline of
phases (plan → research → compose) by watching the event stream and
reading the `author` field on each event.
"""
from __future__ import annotations

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

load_dotenv()

_has_key = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
_use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in {"1", "true", "yes"}
if not (_has_key or _use_vertex):
    print(
        "[travel-planner] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY and "
        "GOOGLE_GENAI_USE_VERTEXAI not true. Chat will fail.", flush=True,
    )
else:
    print(f"[travel-planner] auth ok · vertex={_use_vertex} · api_key={'set' if _has_key else 'unset'}", flush=True)

from travel_planner import root_agent  # noqa: E402
from travel_planner.metrics import MetricsStore, TurnMetrics  # noqa: E402
from travel_planner.introspect import introspect  # noqa: E402


APP_NAME = "travel-planner"
USER_ID = "guest"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Travel planner", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _primary_model() -> str:
    """Best-effort: the composer author's model, which dominates cost."""
    for sub in getattr(root_agent, "sub_agents", []) or []:
        model = getattr(sub, "model", None)
        if model:
            return model
    return "gemini-3-flash-preview"


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "root": root_agent.name,
        "shape": "sequential(planner, parallel(flights, hotels, activities), composer)",
    }


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics.snapshot()


@app.get("/introspect")
async def get_introspect() -> dict:
    return introspect(root_agent)


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
    turn = TurnMetrics(model=_primary_model())
    try:
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=new_message
        ):
            author = event.author or ""
            turn.record_usage(getattr(event, "usage_metadata", None))
            turn.record_event_signals(event)
            yield _sse({"kind": "author", "author": author})
            for part in (event.content.parts if event.content else []):
                if part.text:
                    turn.mark_first_token()
                    yield _sse({"kind": "text", "author": author, "data": part.text})
                if part.function_call:
                    turn.record_tool_call()
                    yield _sse({
                        "kind": "tool_call",
                        "author": author,
                        "name": part.function_call.name,
                        "args": dict(part.function_call.args or {}),
                    })
                if part.function_response:
                    yield _sse({
                        "kind": "tool_result",
                        "author": author,
                        "name": part.function_response.name,
                        "data": part.function_response.response,
                    })
            yield _sse({
                "kind": "metrics_tick",
                "author": author,
                "metrics": turn.as_dict(),
            })
            if event.is_final_response():
                turn.finish()
                metrics.record(turn)
                yield _sse({
                    "kind": "turn_complete",
                    "author": author,
                    "metrics": turn.as_dict(),
                })
    except Exception as e:
        turn.finish(error=str(e))
        metrics.record(turn)
        yield _sse({"kind": "error", "data": str(e), "metrics": turn.as_dict()})


@app.post("/chat/{session_id}")
async def chat(session_id: str, body: ChatInput) -> StreamingResponse:
    return StreamingResponse(
        _stream(session_id, body.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8002)))
