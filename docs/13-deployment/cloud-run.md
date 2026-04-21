# Cloud Run

<span class="kicker">ch 13 · page 2 of 3</span>

Cloud Run runs any container behind a managed HTTP endpoint. ADK's
`adk deploy cloud_run` builds an image with the right entry point;
you keep full control over the Dockerfile, networking, and auth.

---

## One-command deploy

```bash
adk deploy cloud_run agents/support \
  --project $GOOGLE_CLOUD_PROJECT \
  --region us-central1 \
  --service_name support-bot
```

Under the hood: generates a Dockerfile that runs `adk api_server`
against your agent module, submits to Cloud Build, deploys to Cloud
Run.

## Custom Dockerfile

If you need a custom image (extra system libs for computer use, a
different WSGI server, private pip index):

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Optional system deps, e.g. for playwright:
# RUN apt-get update && apt-get install -y ...

COPY . .
ENV PORT=8080
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

Your `server.py` is a FastAPI wrapper around the runner (see
[Chapter 1 — First agent](../01-getting-started/first-agent.md)).
Deploy with `gcloud run deploy`.

## Sessions and memory

With Cloud Run, the `InMemoryRunner` is not enough — instances come
and go. Wire up a real session service:

```python
from google.adk.runners import Runner
from google.adk.sessions import VertexAiSessionService
from google.adk.memory import VertexAiMemoryBankService

runner = Runner(
    agent=root_agent,
    session_service=VertexAiSessionService(
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.environ["GOOGLE_CLOUD_LOCATION"],
        agent_engine_id=os.environ["AGENT_ENGINE_ID"]),
    memory_service=VertexAiMemoryBankService(
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.environ["GOOGLE_CLOUD_LOCATION"],
        agent_engine_id=os.environ["AGENT_ENGINE_ID"]),
)
```

You can still create an Agent Engine *only* for its session/memory
backing, while serving traffic from Cloud Run. Common pattern.

## WebSockets for live audio

Cloud Run supports WebSockets. For live voice agents, Cloud Run is
a better fit than Agent Engine — the `voice-agents` example
[deploys this way](../06-multimodal/voice-agents.md).

Set `--timeout=3600` and allocate more CPU for concurrent live
sessions.

## Auth

- **IAM** on the service — fine for server-to-server calls.
- **Identity-Aware Proxy (IAP)** — user-level auth at the edge.
- **Signed JWTs** — for programmatic clients.

Pick one; do not mix unless you have a reason.

---

## See also

- [Chapter 14 — Safety](../14-safety/index.md).
