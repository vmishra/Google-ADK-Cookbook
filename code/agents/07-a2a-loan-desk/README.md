# 07 · A2A loan desk

Two agents in two processes, talking over HTTP. The primitive on
show: **agent-to-agent federation** — a call that crosses a real
process boundary, with each side carrying its own telemetry and
introspect.

- **`loan_officer`** (port **8007**) — customer-facing desk.
  Pulls applicant files, calls the bureau for a report, computes
  EMI, records a decision.
- **`credit_bureau`** (port **8017**) — BharatCredit scoring
  service. Exposes `POST /score` as the A2A entry point; the officer
  talks to it via `httpx`.

Both agents are regular `LlmAgent`s with `/health`, `/metrics`,
`/introspect`, `/session`, `/chat/{session_id}`. The bureau adds one
LLM-free endpoint (`POST /score`) that the officer's
`request_credit_report` tool posts to.

---

## Run

You need **two terminals** (or two tmux panes).

```bash
cd code/agents/07-a2a-loan-desk
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # add your GOOGLE_API_KEY
```

**Terminal 1 — bureau first (the officer depends on it):**

```bash
python server_bureau.py
# → http://127.0.0.1:8017
```

**Terminal 2 — officer:**

```bash
python server_officer.py
# → http://127.0.0.1:8007
```

The officer reads `BUREAU_URL` on startup (default
`http://127.0.0.1:8017`). Set it in `.env` if you want to point
the desk at a bureau running elsewhere.

---

## Prompts worth trying

> Pull APP-501 and let's work the file.

> Look at APP-612. Work it end to end — bureau, EMI, decision.

> APP-704 — they're asking for ₹7.5L at 30 months, business is
> export packaging. What's the call?

---

## Flow (what you'll see in the portal)

1. **Lookup.** Agent calls `lookup_applicant`. You'll see the ticket
   size, tenure, and business restated in one line.
2. **Bureau call.** Agent calls `request_credit_report`. The SSE
   stream emits a `peer_call` frame — the officer is hitting the
   bureau in another process. The returned report shows up inline.
3. **EMI.** Agent calls `calculate_emi` with a rate inside the band
   (prime / near-prime / sub-prime).
4. **Decision.** Agent calls `record_decision` and closes with two
   or three lines: decision, EMI, coverage, one-line rationale.

If the bureau process isn't running, the tool returns
`{"error": "bureau_unreachable", ...}` and the officer stops rather
than inventing numbers.

---

## Endpoints

Loan officer (8007):

| Method | Path | |
|---|---|---|
| GET | `/health` | Liveness + `bureau_url`. |
| POST | `/session` | |
| POST | `/chat/{session_id}` | SSE stream. |
| GET | `/metrics`, `/introspect` | Standard. |

Credit bureau (8017):

| Method | Path | |
|---|---|---|
| POST | `/score` | **A2A entry point.** LLM-free scoring. |
| GET | `/health`, `/metrics`, `/introspect` | Standard. |
| POST | `/session`, `/chat/{session_id}` | Optional conversational wrapper. |
