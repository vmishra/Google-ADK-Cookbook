# Chapter 16 — Interop

<span class="kicker">chapter 16 · playing well with others</span>

ADK is designed to coexist with other agent frameworks, not replace
them. The three open protocols — **MCP** for tools, **A2A** for
agents, **OpenTelemetry** for tracing — are the interop surface.

This chapter covers both directions: using non-ADK things inside
ADK, and exposing ADK things to non-ADK callers.

```mermaid
flowchart TB
  subgraph In[Into ADK]
    LC[LangChain tools]
    CM[CrewAI crews]
    MCP[MCP servers]
    RA[Remote A2A agents]
  end
  subgraph Out[Out of ADK]
    MCPOut[Expose as MCP]
    A2AOut[Expose as A2A]
    OTel[Export traces via OTel]
    REST[adk api_server REST]
  end
  style MCP fill:#c9a45a,color:#0f0f12
  style RA fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [MCP](mcp.md) | Tools in both directions |
| [A2A](a2a.md) | Agents across process and framework |
| [LangChain/LangGraph bridge](langchain-langgraph-bridge.md) | Using LC tools in ADK; wrapping ADK for LC |
