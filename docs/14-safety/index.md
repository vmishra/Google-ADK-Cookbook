# Chapter 14 — Safety

<span class="kicker">chapter 14 · guardrails, approvals, red-team</span>

Safety in an agent system is layered. Tool-level gates, callback
policies, approval flows for destructive operations, and evaluation
for regressions. This chapter covers the three layers and how they
compose.

```mermaid
flowchart TB
  Input[User input] --> G1[Input guardrails<br/>before_agent]
  G1 --> M[Model + tools]
  M --> G2[Tool gates<br/>before_tool]
  G2 --> H{destructive?}
  H -->|yes| Approve[LongRunningFunctionTool<br/>human approval]
  H -->|no| Exec[Execute]
  Approve --> Exec
  Exec --> G3[Output filters<br/>after_model]
  G3 --> U[User]
  style G1 fill:#c9a45a,color:#0f0f12
  style G2 fill:#c9a45a,color:#0f0f12
  style G3 fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Guardrails](guardrails.md) | Input/output filters, content policy, rate limits |
| [Approval flows](approval-flows.md) | Human-in-the-loop for high-stakes actions |
