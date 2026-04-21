# Chapter 18 — Case studies

<span class="kicker">chapter 18 · three production shapes</span>

Three case studies in the architectures and trade-offs you see in
production ADK deployments. Each is abstracted from the
`adk-samples` repository and real customer engagements.

```mermaid
flowchart LR
  A[Support triage] --> B[Research assistant]
  B --> C[Voice concierge]
  style A fill:#c9a45a,color:#0f0f12
  style B fill:#c9a45a,color:#0f0f12
  style C fill:#c9a45a,color:#0f0f12
```

| Page | Case |
|---|---|
| [Support triage](support-triage.md) | Coordinator + specialists + memory |
| [Research assistant](research-assistant.md) | Deep research + RAG + citations |
| [Voice concierge](voice-concierge.md) | Live voice + approvals + a real booking system |
