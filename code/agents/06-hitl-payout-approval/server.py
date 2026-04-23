"""FastAPI bridge for the HITL payout agent.

Adds two primitives on top of the baseline server:

- Human-in-the-loop. When `request_approval` is called, we emit a
  `pending_approval` SSE frame the portal renders as an Approve/Deny
  card. POST /approve writes the decision into session state via an
  append_event state_delta — the next user turn's `check_approval`
  tool picks it up and the agent resumes.

- Artifacts. We register an InMemoryArtifactService on the Runner so
  `tool_context.save_artifact` works. When an event carries
  `actions.artifact_delta`, we emit an `artifact_ready` SSE frame.
  GET /artifact/{session_id}/{filename} serves the bytes.
"""
from __future__ import annotations

import base64
import json
import os
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.events.event import Event
from google.adk.events.event_actions import EventActions
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types
from pydantic import BaseModel

load_dotenv()

_has_key = bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
_use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in {"1", "true", "yes"}
if not (_has_key or _use_vertex):
    print(
        "[hitl-payout] WARNING: no GOOGLE_API_KEY / GEMINI_API_KEY and "
        "GOOGLE_GENAI_USE_VERTEXAI not true. Chat will fail.",
        flush=True,
    )
else:
    print(f"[hitl-payout] auth ok · vertex={_use_vertex} · api_key={'set' if _has_key else 'unset'}", flush=True)

from hitl_payout import root_agent  # noqa: E402
from hitl_payout.metrics import MetricsStore, TurnMetrics  # noqa: E402
from hitl_payout.introspect import introspect  # noqa: E402


APP_NAME = "hitl-payout"
USER_ID = "operator"

session_service = InMemorySessionService()
artifact_service = InMemoryArtifactService()
runner = Runner(
    app_name=APP_NAME,
    agent=root_agent,
    session_service=session_service,
    artifact_service=artifact_service,
)
metrics = MetricsStore()

app = FastAPI(title="HITL payout approval", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatInput(BaseModel):
    message: str


class ApproveInput(BaseModel):
    draft_id: str
    decision: str  # "approved" | "denied"
    approver: str = "operator"
    reason: str | None = None


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


@app.get("/introspect")
async def get_introspect() -> dict:
    return introspect(root_agent)


@app.post("/session")
async def new_session() -> dict:
    session = await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID
    )
    return {"session_id": session.id}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


async def _emit_artifacts(event, session_id: str) -> list[dict]:
    """Turn an event's artifact_delta into frame dicts for the SSE stream."""
    actions = getattr(event, "actions", None)
    delta = getattr(actions, "artifact_delta", None) if actions else None
    frames: list[dict] = []
    if not delta:
        return frames
    for filename, version in delta.items():
        part = await artifact_service.load_artifact(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id,
            filename=filename,
            version=version,
        )
        inline = getattr(part, "inline_data", None) if part else None
        mime = getattr(inline, "mime_type", "application/octet-stream") if inline else "application/octet-stream"
        size = len(inline.data) if inline and getattr(inline, "data", None) else 0
        frames.append({
            "kind": "artifact_ready",
            "filename": filename,
            "version": int(version),
            "mime_type": mime,
            "size_bytes": size,
            "download_url": f"/artifact/{session_id}/{filename}?v={int(version)}",
        })
    return frames


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
                    response = part.function_response.response or {}
                    yield _sse({
                        "kind": "tool_result",
                        "author": author,
                        "name": part.function_response.name,
                        "data": response,
                    })
                    # HITL signal: request_approval returned a pending
                    # handle — surface a pending_approval card.
                    if (
                        part.function_response.name == "request_approval"
                        and isinstance(response, dict)
                        and response.get("status") == "pending"
                    ):
                        yield _sse({
                            "kind": "pending_approval",
                            "author": author,
                            "draft_id": response.get("draft_id"),
                            "approver_team": response.get("approver_team"),
                            "amount_inr": response.get("amount_inr"),
                            "vendor": response.get("vendor"),
                            "requested_at": response.get("requested_at"),
                        })
            for frame in await _emit_artifacts(event, session_id):
                yield _sse(frame)
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


@app.post("/approve/{session_id}")
async def approve(session_id: str, body: ApproveInput) -> dict:
    """Record a human decision against a pending draft.

    Writes the decision into the session's `payouts.decisions` map via
    a state_delta event, then returns. The portal is expected to send
    a follow-up user turn (e.g. "Approval recorded — please continue")
    so the agent resumes and reads the decision.
    """
    decision = body.decision.strip().lower()
    if decision not in {"approved", "denied"}:
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'denied'")
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")

    payouts = dict(session.state.get("payouts") or {"drafts": {}, "decisions": {}, "posted": {}})
    decisions = dict(payouts.get("decisions") or {})
    from datetime import datetime, timezone
    decisions[body.draft_id] = {
        "decision": decision,
        "approver": body.approver,
        "reason": body.reason,
        "at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    payouts["decisions"] = decisions

    # Append a state-only event so the session service persists the
    # mutation. author="system" keeps it out of the conversation.
    await session_service.append_event(
        session,
        Event(
            author="system",
            actions=EventActions(state_delta={"payouts": payouts}),
        ),
    )
    return {"ok": True, "draft_id": body.draft_id, "decision": decision}


@app.get("/artifact/{session_id}/{filename}")
async def get_artifact(session_id: str, filename: str, v: int | None = None):
    part = await artifact_service.load_artifact(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=session_id,
        filename=filename,
        version=v,
    )
    if part is None:
        raise HTTPException(status_code=404, detail="artifact not found")
    inline = getattr(part, "inline_data", None)
    if not inline or not getattr(inline, "data", None):
        raise HTTPException(status_code=404, detail="artifact has no inline bytes")
    data = inline.data
    if isinstance(data, str):  # some backends base64-encode
        try:
            data = base64.b64decode(data)
        except Exception:
            data = data.encode()
    return Response(
        content=data,
        media_type=getattr(inline, "mime_type", "application/octet-stream"),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8006)))
