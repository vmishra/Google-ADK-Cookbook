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

from travel_planner import root_agent  # noqa: E402


APP_NAME = "travel-planner"
USER_ID = "guest"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
app = FastAPI(title="Travel planner", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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
    try:
        async for event in runner.run_async(
            user_id=USER_ID, session_id=session_id, new_message=new_message
        ):
            author = event.author or ""
            # Emit a phase-change signal whenever the author changes.
            yield _sse({"kind": "author", "author": author})
            for part in (event.content.parts if event.content else []):
                if part.text:
                    yield _sse({"kind": "text", "author": author, "data": part.text})
                if part.function_call:
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
                yield _sse({"kind": "turn_complete", "author": author})
    except Exception as e:
        yield _sse({"kind": "error", "data": str(e)})


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
