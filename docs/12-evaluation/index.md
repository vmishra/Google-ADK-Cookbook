# Chapter 12 — Evaluation

<span class="kicker">chapter 12 · eval sets, metrics, CI</span>

Agent evaluation is trajectory + response. Did the agent call the
right tools in the right order, and did its final output meet the
bar. ADK ships both kinds and a CLI that runs them.

```mermaid
flowchart LR
  Test[.test.json<br/>unit-style] --> Runner[adk eval]
  EvalSet[.evalset.json<br/>integration] --> Runner
  Runner --> Traj[Trajectory<br/>metrics]
  Runner --> Resp[Response<br/>metrics]
  Traj --> CI[CI gate]
  Resp --> CI
  style Runner fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Eval sets](eval-sets.md) | Writing `.test.json` and `.evalset.json` |
| [Metrics](metrics.md) | Trajectory and response metrics in detail |
| [CI integration](ci-integration.md) | GitHub Actions and Cloud Build gates |
