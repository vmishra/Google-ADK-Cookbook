# Chapter 15 — Cost & latency

<span class="kicker">chapter 15 · what actually costs you money</span>

Four levers: model choice, caching, context compression, and batching.
This chapter ranks them by impact and covers the settings for each.

```mermaid
flowchart LR
  Cost --> ModelChoice[Model choice]
  Cost --> Cache[Prompt caching]
  Cost --> Compress[Context compression]
  Cost --> Batch[Batch / parallel]
  style ModelChoice fill:#c9a45a,color:#0f0f12
  style Cache fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Caching](caching.md) | Prompt caching, tool-result caching |
| [Model routing](model-routing.md) | Pro vs Flash, LiteLLM, fallbacks |
