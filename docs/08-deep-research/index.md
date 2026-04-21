# Chapter 8 — Deep research

<span class="kicker">chapter 08 · long-horizon, multi-step research agents</span>

A "deep research" agent is what you get when you give a planner-led
sequential workflow access to search, memory, and several generations
of refinement. This chapter builds one from scratch and explains the
decisions that separate a solid deep researcher from a brittle one.

```mermaid
flowchart LR
  Q[question] --> P[planner]
  P --> F[fan-out researcher]
  F --> A1[web_search]
  F --> A2[kb_search]
  F --> A3[memory_search]
  A1 --> G[synthesiser]
  A2 --> G
  A3 --> G
  G --> C{good enough?}
  C -->|no| P
  C -->|yes| W[writer]
  W --> Out[report + citations]
  style P fill:#c9a45a,color:#0f0f12
  style G fill:#c9a45a,color:#0f0f12
  style W fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Planner/researcher/writer](planner-researcher-writer.md) | The full pipeline with code |
