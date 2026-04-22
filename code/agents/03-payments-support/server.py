"""WebSocket bridge for the payments voice agent.

Bridges a browser microphone / speaker to Gemini Live via ADK's
`run_live()`. Audio format on the wire:

  browser → server   PCM16 @ 16 kHz, little-endian, raw bytes
  server  → browser  PCM16 @ 24 kHz, raw bytes (base64 over JSON)

Message protocol (JSON) the portal speaks to us:

  {"kind": "audio",  "data": "<base64 pcm16 @ 16k>"}
  {"kind": "text",   "data": "..."}                       # typed override
  {"kind": "end"}                                          # close session

And we emit:

  {"kind": "audio",      "data": "<base64 pcm16 @ 24k>"}
  {"kind": "transcript", "role": "user"|"model", "data": "..."}
  {"kind": "tool_call",  "name": "...", "args": {...}}
  {"kind": "tool_result","name": "...", "data": ...}
  {"kind": "turn_complete"}
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import InMemoryRunner
from google.genai import types

load_dotenv()

from payments_support import root_agent  # noqa: E402


APP_NAME = "payments-voice"
USER_ID = "caller"

runner = InMemoryRunner(agent=root_agent, app_name=APP_NAME)
app = FastAPI(title="Payments voice support", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "agent": APP_NAME,
        "model": root_agent.model,
        "modality": "voice (bidirectional)",
    }


def _run_config() -> RunConfig:
    """Configure Live for a support-agent workload.

    - AUDIO out with transcripts surfaced on both sides.
    - Session resumption so a dropped socket can reconnect.
    - A calm, measured voice. Override via env.
    """
    voice_name = os.environ.get("VOICE_NAME", "Aoede")
    return RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        ),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
    )


async def _forward_browser_to_model(ws: WebSocket, queue: LiveRequestQueue) -> None:
    """Read JSON messages from the browser, push into the live queue."""
    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("kind")
            if kind == "audio":
                pcm = base64.b64decode(msg["data"])
                queue.send_realtime(types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=pcm,
                ))
            elif kind == "text":
                queue.send_content(types.Content(
                    role="user", parts=[types.Part(text=msg["data"])]
                ))
            elif kind == "end":
                queue.close()
                return
    except WebSocketDisconnect:
        queue.close()


async def _forward_model_to_browser(
    ws: WebSocket, session_id: str, queue: LiveRequestQueue
) -> None:
    """Read events from run_live, render them to the portal."""
    try:
        async for event in runner.run_live(
            user_id=USER_ID,
            session_id=session_id,
            live_request_queue=queue,
            run_config=_run_config(),
        ):
            for part in (event.content.parts if event.content else []):
                if part.inline_data and part.inline_data.data:
                    await ws.send_json({
                        "kind": "audio",
                        "data": base64.b64encode(part.inline_data.data).decode(),
                    })
                if part.text:
                    await ws.send_json({
                        "kind": "transcript",
                        "role": event.content.role or "model",
                        "data": part.text,
                    })
                if part.function_call:
                    await ws.send_json({
                        "kind": "tool_call",
                        "name": part.function_call.name,
                        "args": dict(part.function_call.args or {}),
                    })
                if part.function_response:
                    await ws.send_json({
                        "kind": "tool_result",
                        "name": part.function_response.name,
                        "data": _jsonable(part.function_response.response),
                    })
            if getattr(event, "turn_complete", False):
                await ws.send_json({"kind": "turn_complete"})
    except WebSocketDisconnect:
        return


def _jsonable(value: Any) -> Any:
    """ADK function responses arrive as dict-like. Make them JSON-safe."""
    try:
        json.dumps(value)
        return value
    except Exception:
        return str(value)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    session = await runner.session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID
    )
    await ws.send_json({"kind": "session", "session_id": session.id})
    queue = LiveRequestQueue()
    await asyncio.gather(
        _forward_browser_to_model(ws, queue),
        _forward_model_to_browser(ws, session.id, queue),
        return_exceptions=True,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", 8003)))
