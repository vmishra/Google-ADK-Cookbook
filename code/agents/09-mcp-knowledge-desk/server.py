"""FastAPI bridge for the MCP knowledge desk.

Same SSE shape as the other agents — the MCP server is an
implementation detail inside the agent's toolset, not a protocol the
portal needs to know about.
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
        "[mcp-knowledge-desk] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY. "
        "Chat will fail.",
        flush=True,
    )
else:
    print(
        f"[mcp-knowledge-desk] auth ok · mcp_root={os.environ.get('MCP_ROOT', '<default>')}",
        flush=True,
    )

from mcp_knowledge_desk import root_agent  # noqa: E402
from mcp_knowledge_desk.metrics import MetricsStore, TurnMetrics  # noqa: E402
from mcp_knowledge_desk.introspect import introspect  # noqa: E402


APP_NAME = "mcp-knowledge-desk"
USER_ID = "engineer"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="MCP knowledge desk", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "mcp_root": os.environ.get("MCP_ROOT"),
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
    turn = TurnMetrics(model=root_agent.model)
    try:
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=new_message
        ):
            turn.record_usage(getattr(event, "usage_metadata", None))
            turn.record_event_signals(event)
            author = event.author or root_agent.name
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
                    # MCP tools can return large blobs (whole files); truncate
                    # the SSE payload so the wire stays light.
                    response = part.function_response.response
                    yield _sse({
                        "kind": "tool_result",
                        "author": author,
                        "name": part.function_response.name,
                        "data": _truncate(response),
                    })
            yield _sse({"kind": "metrics_tick", "author": author, "metrics": turn.as_dict()})
            if event.is_final_response():
                turn.finish()
                metrics.record(turn)
                yield _sse({"kind": "turn_complete", "author": author, "metrics": turn.as_dict()})
    except Exception as e:
        turn.finish(error=str(e))
        metrics.record(turn)
        yield _sse({"kind": "error", "data": str(e), "metrics": turn.as_dict()})


def _truncate(value, limit: int = 1200):
    """Trim long strings inside the tool response to keep the SSE wire light."""
    if isinstance(value, str):
        return value if len(value) <= limit else value[:limit] + f"\n\n… [{len(value) - limit} bytes truncated]"
    if isinstance(value, dict):
        return {k: _truncate(v, limit) for k, v in value.items()}
    if isinstance(value, list):
        return [_truncate(v, limit) for v in value[:20]]
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
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8009)))
