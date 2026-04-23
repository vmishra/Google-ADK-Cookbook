"""FastAPI bridge for the eval harness.

Standard endpoints plus one extra:

  POST /run/{session_id}/{suite_id}   Stream the whole suite as SSE,
                                      one frame per case as it finishes,
                                      plus a final summary.

The portal hits that endpoint to light up a grid of pass/fail tiles.
The regular /chat endpoint is still there — the agent can list
suites and run one case on demand.
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
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
        "[eval-harness] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY and "
        "GOOGLE_GENAI_USE_VERTEXAI not true. /chat will fail; /run still "
        "works if target agents have auth.",
        flush=True,
    )
else:
    print(f"[eval-harness] auth ok · vertex={_use_vertex}", flush=True)

from eval_harness import root_agent  # noqa: E402
from eval_harness.metrics import MetricsStore, TurnMetrics  # noqa: E402
from eval_harness.introspect import introspect  # noqa: E402
from eval_harness.suites import SUITES, get_suite, list_suites  # noqa: E402
from eval_harness.runner import run_case  # noqa: E402


APP_NAME = "eval-harness"
USER_ID = "qa"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
metrics = MetricsStore()
app = FastAPI(title="Eval harness", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatInput(BaseModel):
    message: str


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "suite_count": len(SUITES),
    }


@app.get("/metrics")
async def get_metrics() -> dict:
    return metrics.snapshot()


@app.get("/introspect")
async def get_introspect() -> dict:
    return introspect(root_agent)


@app.get("/suites")
async def get_suites() -> dict:
    return {"suites": list_suites()}


@app.post("/session")
async def new_session() -> dict:
    session = await runner.session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID
    )
    return {"session_id": session.id}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


async def _stream_chat(session_id: str, message: str) -> AsyncIterator[str]:
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
        _stream_chat(session_id, body.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _stream_suite(suite_id: str) -> AsyncIterator[str]:
    """Run every case in a suite sequentially, stream per-case verdicts."""
    suite = get_suite(suite_id)
    if suite is None:
        yield _sse({"kind": "error", "data": f"unknown suite: {suite_id}"})
        return

    yield _sse({
        "kind": "suite_started",
        "suite_id": suite_id,
        "label": suite["label"],
        "target_url": suite["target_url"],
        "target_label": suite["target_label"],
        "case_count": len(suite["cases"]),
    })

    passed = 0
    failed = 0
    started = time.monotonic()
    for case in suite["cases"]:
        yield _sse({
            "kind": "case_started",
            "suite_id": suite_id,
            "case_id": case["id"],
            "prompt": case["prompt"],
        })
        verdict = await run_case(
            target_url=suite["target_url"],
            prompt=case["prompt"],
            rubric=case["rubric"],
        )
        if verdict["passed"]:
            passed += 1
        else:
            failed += 1
        yield _sse({
            "kind": "case_result",
            "suite_id": suite_id,
            "case_id": case["id"],
            "prompt": case["prompt"],
            "passed": verdict["passed"],
            "checks": verdict["checks"],
            "transcript": verdict["transcript"],
            "error": verdict.get("error"),
        })
        # let the event loop breathe between cases
        await asyncio.sleep(0)

    yield _sse({
        "kind": "suite_summary",
        "suite_id": suite_id,
        "passed": passed,
        "failed": failed,
        "total": passed + failed,
        "pass_rate": round(passed / max(1, passed + failed), 3),
        "elapsed_ms": round((time.monotonic() - started) * 1000, 1),
    })


@app.post("/run/{suite_id}")
async def run_suite(suite_id: str) -> StreamingResponse:
    if suite_id not in SUITES:
        raise HTTPException(status_code=404, detail=f"unknown suite: {suite_id}")
    return StreamingResponse(
        _stream_suite(suite_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8008)))
