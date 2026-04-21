"""FastAPI server wrapping the production agent."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from google.genai import types

from .agent import build_runner


runner = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global runner
    runner = build_runner()
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/v1/sessions")
async def create_session(body: dict):
    s = await runner.session_service.create_session(
        app_name="prod", user_id=body["user_id"])
    return {"session_id": s.id}


@app.post("/v1/sessions/{sid}/messages")
async def send_message(sid: str, body: dict):
    async def stream():
        async for event in runner.run_async(
            user_id=body["user_id"], session_id=sid,
            new_message=types.Content(role="user", parts=[
                types.Part(text=body["message"])])):
            if event.content and event.content.parts:
                for p in event.content.parts:
                    if p.text:
                        yield f"data: {p.text}\n\n"
        yield "event: done\ndata: {}\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
