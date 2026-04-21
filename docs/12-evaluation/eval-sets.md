# Eval sets

<span class="kicker">ch 12 · page 1 of 3</span>

Two file formats. `.test.json` for a single turn; `.evalset.json`
for multi-turn conversations and larger batches.

---

## `.test.json`

```json
{
  "name": "refund_happy_path",
  "input": {
    "role": "user",
    "parts": [{"text": "I'd like a refund on order 7821."}]
  },
  "expected_tool_use": [
    {"tool_name": "lookup_order", "tool_input": {"order_id": "7821"}},
    {"tool_name": "issue_refund", "tool_input": {"order_id": "7821"}}
  ],
  "expected_intermediate_agent_responses": [],
  "reference": "Your refund of $52.14 has been issued."
}
```

## `.evalset.json`

```json
{
  "eval_set_id": "support_regression_2026_04",
  "name": "Support regression suite",
  "eval_cases": [
    {
      "eval_id": "refund_requires_admin",
      "conversation": [
        {"user": "Mark order 7821 as paid.",
         "expected_tool_use": [],
         "reference_final_response": "That action requires admin access."}
      ],
      "session_input": {"state": {"user:is_admin": false}}
    },
    {
      "eval_id": "refund_as_admin",
      "conversation": [
        {"user": "Mark order 7821 as paid.",
         "expected_tool_use": [{"tool_name": "mark_paid",
                                "tool_input": {"invoice_id": "7821"}}],
         "reference_final_response": "Invoice 7821 is now marked paid."}
      ],
      "session_input": {"state": {"user:is_admin": true}}
    }
  ]
}
```

Key points:

- `session_input.state` pre-populates state before the turn runs —
  essential for testing gated behaviour.
- `conversation` is ordered; each turn can have its own expectations.
- `expected_tool_use` with `tool_input` enables trajectory
  evaluation. Leaving it `[]` means "we do not check tools".

## Creating from the dev UI

The dev UI has a "save as test" button that converts the current
session into a `.test.json` stub. Fill in the `reference` and
`expected_tool_use` by hand.

## Directory convention

```
agents/support/
├── agent.py
└── eval/
    ├── config.json
    ├── regression.evalset.json
    ├── refund_happy_path.test.json
    └── gated_actions.test.json
```

`config.json` is the criteria configuration:

```json
{
  "criteria": {
    "tool_trajectory_avg_score": 0.95,
    "response_match_score": 0.75,
    "rubric_based_final_response_quality_v1": 0.8
  }
}
```

---

## See also

- `contributing/samples/*` — many samples ship `.test.json` files.
- [`examples/18-eval-suite`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/18-eval-suite).
