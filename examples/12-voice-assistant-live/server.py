"""FastAPI WebSocket server bridging a browser to the voice agent."""
import asyncio
import base64

from fastapi import FastAPI, WebSocket
from google.adk.agents import LiveRequestQueue, RunConfig
from google.adk.runners import InMemoryRunner
from google.genai import types

from .agent import root_agent


app = FastAPI()
runner = InMemoryRunner(agent=root_agent, app_name="voice")


@app.websocket("/stream")
async def stream(ws: WebSocket):
    await ws.accept()
    session = await runner.session_service.create_session(
        app_name="voice", user_id="web")
    queue = LiveRequestQueue()
    cfg = RunConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede"))),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    async def from_browser():
        while True:
            msg = await ws.receive_json()
            if msg["type"] == "audio":
                data = base64.b64decode(msg["data"])
                await queue.send_content(types.Content(parts=[types.Part(
                    inline_data=types.Blob(mime_type="audio/pcm", data=data))]))
            elif msg["type"] == "end":
                await queue.close(); break

    async def to_browser():
        async for event in runner.run_live(
            user_id="web", session_id=session.id,
            live_request_queue=queue, run_config=cfg):
            if event.content and event.content.parts:
                for p in event.content.parts:
                    if p.inline_data:
                        await ws.send_json({"type": "audio",
                            "data": base64.b64encode(p.inline_data.data).decode()})
                    elif p.text:
                        await ws.send_json({"type": "text", "data": p.text})
            if event.turn_complete:
                await ws.send_json({"type": "turn_complete"})

    await asyncio.gather(from_browser(), to_browser())
