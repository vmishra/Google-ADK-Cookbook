"""Credit bureau FastAPI service (port 8017).

Two entry points:

- POST /score      Direct, LLM-free scoring. This is the A2A call
                   the loan officer uses. JSON in, JSON out.

- POST /chat/{id}  Full conversational wrapper — the bureau agent
                   running on its own runner. Useful if you want to
                   talk to the bureau from an interactive client.

Both are served from the same process with shared metrics and
introspect so the agent's telemetry is the same shape as any other
agent in this cookbook.
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
from pydantic import BaseModel, Field

load_dotenv()

_has_key = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
_use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in {"1", "true", "yes"}
if not (_has_key or _use_vertex):
    print(
        "[credit-bureau] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY and "
        "GOOGLE_GENAI_USE_VERTEXAI not true. /chat will fail; /score still works.",
        flush=True,
    )
else:
    print(f"[credit-bureau] auth ok · vertex={_use_vertex}", flush=True)

from credit_bureau import root_agent  # noqa: E402
from credit_bureau.tools import score_credit  # noqa: E402
from credit_bureau.metrics import MetricsStore, TurnMetrics  # noqa: E402
from credit_bureau.introspect import introspect  # noqa: E402


APP_NAME = "credit-bureau"
USER_ID = "peer"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Credit bureau (BharatCredit)", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ScoreInput(BaseModel):
    pan: str = Field(min_length=5, max_length=16)
    requested_amount_inr: int = Field(ge=0)
    existing_obligations_inr: int = Field(ge=0, default=0)


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "agent": APP_NAME, "model": root_agent.model}


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics.snapshot()


@app.get("/introspect")
async def get_introspect() -> dict:
    return introspect(root_agent)


@app.post("/score")
async def score(body: ScoreInput) -> dict:
    """The A2A entry point. Peer agents post here to get a report.

    No LLM call — this is the raw scoring tool. The bureau's
    conversational agent uses the same function, so /chat and /score
    return the same numbers for the same PAN.
    """
    return score_credit(
        pan=body.pan,
        requested_amount_inr=body.requested_amount_inr,
        existing_obligations_inr=body.existing_obligations_inr,
    )


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
                    yield _sse({
                        "kind": "tool_result",
                        "author": author,
                        "name": part.function_response.name,
                        "data": part.function_response.response,
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


@app.post("/chat/{session_id}")
async def chat(session_id: str, body: ChatInput) -> StreamingResponse:
    return StreamingResponse(
        _stream(session_id, body.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("BUREAU_PORT", 8017)))
