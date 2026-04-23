# 10 · Live card scanner

Hold a credit or debit card to your camera. The agent reads the
long number, identifies the issuing bank from the first six digits
(the BIN), and reports the arithmetic sum of all the digits.

ADK primitive on show: **`run_live()` + `LiveRequestQueue` with
`image/jpeg` Blob frames** and TEXT response modality.

> Use a test card or your own card at your own discretion. The
> agent explicitly ignores the CVV, expiry, and cardholder name,
> but anything visible in frame still travels to the model.

---

## Run

```bash
cd code/agents/10-live-video-coach
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GOOGLE_API_KEY
python server.py
```

Server listens on `http://127.0.0.1:8010` with a WebSocket at
`ws://127.0.0.1:8010/ws`.

---

## What you'll see

Output is pinned to four lines — deliberately flat, fast to read
off a phone:

```
number  4147 0900 1234 5678
issuer  HDFC Bank · Visa · IN
sum     46
luhn    ok
```

If the frame is blurry or the number is covered, the agent asks
you to angle it or hold steadier instead of guessing.

If the BIN isn't in its small table, it falls back to the network
(Visa / Mastercard / Amex / RuPay / JCB / UnionPay) and reports
"unknown issuer".

---

## Prompts worth trying

You don't need to type anything — just hold the card to the
camera. For typed overrides:

> read this card

> the last four are covered, can you work from the first twelve?

---

## Wire protocol

Browser → server (JSON over WS):

| `kind` | fields | |
|---|---|---|
| `video` | `data` (base64 JPEG) | one frame (~1fps) |
| `text` | `data` (string) | typed override |
| `end` | — | close session |

Server → browser:

| `kind` | fields |
|---|---|
| `session` | `session_id` |
| `transcript` | `role`, `data` |
| `tool_call` / `tool_result` | standard |
| `metrics_tick` / `turn_complete` | `metrics` |
| `error` | `data` |

---

## Endpoints

| Method | Path | |
|---|---|---|
| WS | `/ws` | Bidirectional live session. |
| GET | `/health`, `/metrics`, `/introspect` | Standard. |
