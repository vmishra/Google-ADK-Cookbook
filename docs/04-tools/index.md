# Chapter 4 — Tools

<span class="kicker">chapter 04 · tools in depth</span>

Worked examples for each tool category. Chapter 2 gave you the
contract; this chapter shows the hands.

```mermaid
flowchart TB
  Function[Function tool] --> OpenAPI[OpenAPI tool]
  OpenAPI --> MCP[MCP tool]
  MCP --> Builtin[Built-in tools]
  Builtin --> LongRun[Long-running]
  LongRun --> AgentAsTool[Agent-as-tool]
  style MCP fill:#c9a45a,color:#0f0f12
  style LongRun fill:#c9a45a,color:#0f0f12
```

| Page | Covers |
|---|---|
| [Function tools](function-tools.md) | Signatures, docstrings, `ToolContext`, error shapes |
| [OpenAPI tools](openapi-tools.md) | `OpenApiTool`, auth, operation ID mapping |
| [MCP tools](mcp-tools.md) | `MCPToolset`, stdio, SSE, streamable HTTP, dynamic headers |
| [Built-in tools](built-in-tools.md) | `google_search`, `VertexAiRagRetrieval`, `load_memory` |
| [Long-running tools](long-running-tools.md) | Human-in-the-loop, resumable sessions |
| [Agent-as-tool](agent-as-tool.md) | `AgentTool`, hierarchical delegation |
