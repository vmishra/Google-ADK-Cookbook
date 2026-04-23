# 06 · HITL payout approval

A partner payout desk for a mid-size fintech. The agent drafts vendor
payouts, routes anything at or above **₹50,000** to a human approver,
and — after the money posts — produces a **PDF voucher** as a session
artifact the portal renders as a download card.

Two ADK primitives on show here:

- **Long-running tools + resumable sessions.** `request_approval` is
  wrapped in `LongRunningFunctionTool`. Its call emits a pending
  handle; the agent stops and waits. A human click on the portal's
  Approve/Deny card hits `POST /approve/{session}`, which writes the
  decision into session state via an `append_event` state_delta. The
  next user turn's `check_approval` tool reads the decision and the
  agent resumes.

- **Artifact service.** After `post_payout` succeeds, `generate_voucher`
  renders a one-page PDF voucher and saves it via
  `tool_context.save_artifact`. The server picks up `event.actions.artifact_delta`
  and emits an `artifact_ready` SSE frame; the portal renders a
  download card pointing at `/artifact/{session}/{filename}`.

---

## Run

```bash
cd code/agents/06-hitl-payout-approval
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GOOGLE_API_KEY
python server.py
```

Server listens on `http://127.0.0.1:8006`.

---

## Prompts worth trying

> Draft a payout of ₹75,000 to V-207 for the October campaign retainer.
> GL per their master. Route approval to finance-controllers.

> V-101 is owed ₹42,000 for last week's logistics invoices. Book it.

> Approval came back — please continue with PO-XXXXXX.

> Draft ₹1,20,000 to V-314 for the Q3 utilities true-up, memo
> "Q3 power reconciliation, contract SKY-2025-11".

---

## Flow (what you'll see in the portal)

1. **Lookup + draft.** Agent calls `lookup_vendor`, then `draft_payout`.
   Low-value drafts (< ₹50,000) can go straight to post.
2. **Approval card.** High-value drafts emit a `pending_approval`
   event — a card appears with Approve / Deny. Clicking posts to
   `/approve` and injects a "decision recorded" user turn.
3. **Resume.** Agent calls `check_approval`, then either `post_payout`
   (approved) or explains the block (denied).
4. **Voucher.** On post, `generate_voucher` writes a PDF artifact.
   The portal renders a download card inline.

Everything is mocked. No money moves. All vendor data is fake.

---

## Endpoints

| Method | Path | What |
|---|---|---|
| GET | `/health` | Liveness. |
| POST | `/session` | Create a session, return `{session_id}`. |
| POST | `/chat/{session_id}` | SSE stream of agent events. |
| POST | `/approve/{session_id}` | Record `{draft_id, decision, approver, reason}`. |
| GET | `/artifact/{session_id}/{filename}` | Download a voucher PDF. |
| GET | `/metrics` | Per-turn telemetry ring buffer + summary. |
| GET | `/introspect` | Agent tree for the Architecture tab. |
