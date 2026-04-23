# 08 · Eval harness

QA regression suite for other agents in this cookbook. Loads canned
prompts with deterministic rubrics (substring, tool-call presence,
latency cap), runs them against a live target agent, and scores
pass/fail per case.

Two ADK primitives on show:

- **Evaluation at the boundary.** The harness treats the target
  agent as a black box — opens a session, streams its SSE, watches
  tool calls fly by, and checks the transcript. No in-process
  wiring; this is how you would evaluate an agent already deployed.

- **A dedicated `/run/{suite_id}` SSE endpoint** that streams
  `suite_started → case_started → case_result → case_result → …
  → suite_summary`. The portal renders this as a grid of tiles that
  turn green or red as each case lands.

Two suites ship:

| Suite | Target | Case count |
|---|---|---|
| `concierge-smoke` | 01 · Concierge (:8001) | 5 |
| `payout-smoke` | 06 · HITL payout (:8006) | 3 |

---

## Run

```bash
cd code/agents/08-eval-harness
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GOOGLE_API_KEY
python server.py
```

Server listens on `http://127.0.0.1:8008`.

You need the target agents running too — if you want the concierge
suite to pass, `01-concierge` must be up on :8001.

---

## Endpoints

| Method | Path | |
|---|---|---|
| GET | `/suites` | List suites with targets and case counts. |
| POST | `/run/{suite_id}` | SSE stream of per-case verdicts + summary. |
| POST | `/chat/{session_id}` | Talk to the harness (lists suites, runs one case). |
| GET | `/health`, `/metrics`, `/introspect` | Standard. |

---

## Prompts worth trying (via /chat)

> What eval suites do you have?

> Run just the off-scope refusal case from the concierge suite.

> Run the high-value-needs-approval case from the payout suite.

For the full run, the portal triggers `/run/{suite_id}` directly.
