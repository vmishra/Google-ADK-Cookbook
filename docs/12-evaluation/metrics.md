# Metrics

<span class="kicker">ch 12 · page 2 of 3</span>

Seven metrics ship. Pick three for CI; use the rest for deeper
review.

---

## Trajectory metrics

### `tool_trajectory_avg_score`

Exact match on tool name + args sequence. Best as a CI gate. Accepts
tolerance on arg order but not on tool names.

Target: **0.9+** for stable agents, **0.95+** for a regression
suite.

### `rubric_based_tool_use_quality_v1`

LLM-judged rubric on whether the tools called were the *right*
tools, allowing semantic flexibility (e.g. `lookup_order_v2` is
fine if `lookup_order` was expected). Use when the exact trajectory
is too strict.

## Response metrics

### `response_match_score`

ROUGE-1 similarity between the agent's final response and the
reference. Default threshold 0.8.

Good for deterministic outputs (structured data, canonical
phrasing). Unforgiving for creative text.

### `final_response_match_v2`

LLM-judged semantic equivalence. Robust to phrasing.

### `rubric_based_final_response_quality_v1`

LLM-judged against a custom rubric you define in the config. This
is the one to reach for when you have opinions about tone,
completeness, or format that are not captured by similarity.

```json
{
  "rubric_based_final_response_quality_v1": {
    "threshold": 0.8,
    "rubric": [
      "The response answers the user's question completely.",
      "Every factual claim is cited with a source from the tools.",
      "The tone is direct and professional; no exclamation marks.",
      "The response is under 150 words."
    ]
  }
}
```

### `hallucinations_v1`

LLM-judged groundedness. Checks every claim against the tool
results actually returned. Use for any research or lookup agent.

### `safety_v1`

Classifier on harmful content categories. Use everywhere.

### `multi_turn_task_success_v1`

Did the conversation accomplish the user's goal across all turns?
Binary per eval case, but aggregates to a rate.

## Picking three for CI

A defensible default:

- `tool_trajectory_avg_score` ≥ 0.9
- `rubric_based_final_response_quality_v1` ≥ 0.8
- `hallucinations_v1` ≥ 0.9 (for RAG-heavy agents)

The rest run weekly on a larger eval set.

---

## See also

- [CI integration](ci-integration.md)
