# 12 — voice-assistant-live

A voice assistant using `runner.run_live()` with the Gemini native
audio model. Includes the FastAPI WebSocket server that bridges a
browser to ADK.

Covers: Chapter 6.

## Run

```bash
pip install -r requirements.txt
uvicorn server:app --reload
```
