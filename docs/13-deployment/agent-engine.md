# Agent Engine

<span class="kicker">ch 13 · page 1 of 3</span>

Vertex AI Agent Engine is the managed runtime for ADK. You package
the agent, push, and a scalable endpoint appears — with session
persistence, memory, and observability already wired up.

---

## One-command deploy

```bash
adk deploy agent_engine agents/support \
  --project $GOOGLE_CLOUD_PROJECT \
  --region us-central1 \
  --display_name support-bot \
  --requirements_file requirements.txt
```

Under the hood: the CLI builds a `reasoning_engine` artifact,
uploads it, and creates (or updates) the engine in Vertex AI.
First deploy takes ~5 minutes; subsequent pushes are ~90 seconds.

## Calling the deployed agent

```python
from vertexai.preview import reasoning_engines

engine = reasoning_engines.ReasoningEngine("projects/.../reasoningEngines/123")
res = engine.query(user_id="u1", message="Where's order 7821?")
for chunk in res:
    print(chunk)
```

Or hit the REST endpoint directly with any HTTP client.

## What you get managed

- **Auto-scaling.** Scales to zero when idle; concurrency limits
  per engine.
- **Sessions.** `VertexAiSessionService` bound to the engine, with
  server-side storage and rewind support.
- **Memory.** `VertexAiMemoryBankService` tied to the engine id.
- **Observability.** Logs + Cloud Trace out of the box.
- **Auth.** IAM on the engine resource; per-user identity passed via
  `user_id`.

## What you give up

- **Custom websockets.** If your app uses WebSockets beyond ADK's
  live-API needs, Cloud Run or GKE is a better fit.
- **Arbitrary process lifetime.** Long-running background work that
  is not in a long-running tool does not fit.
- **Sidecars.** No sidecar containers; if you need one, GKE.

## Environment and secrets

Pass `--env_vars KEY=VALUE` at deploy. For secrets, use Secret
Manager — mount via the env var pattern:

```bash
adk deploy agent_engine agents/support \
  --env_vars NOTION_TOKEN_SECRET=projects/.../secrets/notion-token/versions/latest
```

Your tool code reads `os.environ["NOTION_TOKEN"]` after resolving
the secret reference.

## CI/CD

Either a Cloud Build trigger on merge to main, or a GitHub Action
using `google-github-actions/auth` + `adk deploy`. Keep a dev
engine for PRs and a prod engine for main.

## Rollbacks

Engines are immutable per version. Roll back by pointing traffic at
a previous version:

```bash
gcloud ai reasoning-engines update $ENGINE --version=$PREV
```

## Limits worth knowing

- Payload size per invocation: tens of MBs (fine for normal chat;
  size-critical multimodal goes via GCS references).
- Cold start: <1s for the engine to accept the request; model latency
  on top.

---

## See also

- `contributing/samples/agent_engine_code_execution`.
