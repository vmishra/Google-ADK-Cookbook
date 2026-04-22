"""FastAPI bridge for the beauty advisor.

Same SSE shape as the concierge and travel planner. Includes a
`/profile` endpoint so the portal can render the live customer
profile alongside the chat — useful for explaining how shared context
carries across the hierarchy.
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

from beauty_advisor import root_agent  # noqa: E402
from beauty_advisor.metrics import MetricsStore, TurnMetrics  # noqa: E402


APP_NAME = "beauty-advisor"
USER_ID = "customer"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Beauty advisor", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "hierarchy": {
            "root": root_agent.name,
            "coordinators": [c.name for c in (root_agent.sub_agents or [])],
        },
    }


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics.snapshot()


@app.get("/profile/{session_id}")
async def get_profile_endpoint(session_id: str) -> dict:
    """Return the live customer profile from session state."""
    try:
        session = await runner.session_service.get_session(
            app_name=APP_NAME, user_id=USER_ID, session_id=session_id
        )
        return {"profile": session.state.get("profile") if session else None}
    except Exception:
        return {"profile": None}


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
            author = event.author or ""
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
            if getattr(event, "turn_complete", False):
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
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8005)))
