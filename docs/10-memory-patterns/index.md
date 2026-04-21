# Chapter 10 — Memory patterns

<span class="kicker">chapter 10 · state, memory, compaction</span>

Chapter 2 introduced the primitives. This chapter is the recipes —
what lives where, when to move data between layers, and how to keep
long-running sessions from drowning in their own history.

```mermaid
flowchart LR
  Turn[Turn] --> S[Session state]
  S -->|on_session_end or explicit| M[Memory service]
  M --> Recall[Next session recalls]
  S -->|periodic| CMP[Compaction]
  CMP --> S
  style M fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Session state](session-state.md) | Prefixes, lifetimes, who writes what |
| [Vertex Memory Bank](vertex-memory-bank.md) | Production long-term memory |
| [Compaction](compaction.md) | Keeping long sessions cheap |
