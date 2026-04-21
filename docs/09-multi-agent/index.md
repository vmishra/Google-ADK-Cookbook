# Chapter 9 — Multi-agent systems

<span class="kicker">chapter 09 · coordination across agents</span>

Real systems have more than one agent. This chapter covers the three
shapes ADK gives you for multi-agent coordination and when to reach
for each.

```mermaid
flowchart TB
  subgraph Three[Three shapes]
    Co[Coordinator<br/>one LlmAgent with sub_agents]
    De[Delegation<br/>AgentTool wrappers]
    Fe[Federation<br/>RemoteA2aAgent over A2A]
  end
  style Co fill:#c9a45a,color:#0f0f12
  style Fe fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Coordinator pattern](coordinator.md) | One router, many workers |
| [Delegation](delegation.md) | Agents-as-tools, scoped capabilities |
| [A2A federation](a2a-federation.md) | Cross-process agents over the open A2A protocol |
