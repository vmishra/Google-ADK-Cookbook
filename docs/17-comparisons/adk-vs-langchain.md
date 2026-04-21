# ADK vs LangChain

<span class="kicker">ch 17 · page 1 of 4</span>

The original. LangChain v0.3 is still the default path for a lot of
single-agent, retrieval-heavy projects.

---

## Where LangChain wins

- **Retrieval ecosystem.** Loaders, splitters, vector stores,
  rerankers — the inventory is bigger than anything else.
- **LCEL composition.** Terse pipelines for *"fetch + prompt + parse"*
  cases. Concise and legible.
- **Adapter availability.** Everything interoperates with it.

## Where ADK wins

| Axis | LangChain | ADK |
|---|---|---|
| Session persistence | DIY or via `RunnableWithMessageHistory` | `SessionService` with 3 built-in backends |
| Long-term memory | DIY | `MemoryService` with Vertex Memory Bank |
| Multi-agent federation | Agents-as-tools | A2A protocol + `RemoteA2aAgent` |
| Voice / live audio | Not in core | `runner.run_live()` + Gemini Live |
| Computer use | Via community tools | `ComputerUseToolset` + Gemini computer-use |
| Evaluation | LangSmith (SaaS) | `adk eval` + programmatic API, no SaaS dep |
| Deployment | DIY | Agent Engine / Cloud Run / GKE |
| Open protocols first | Mixed | MCP + A2A + OTel |

## Migration

A LangChain tool becomes an ADK function tool in minutes:

```python
# LangChain
@tool
def lookup_order(order_id: str) -> dict:
    """Look up an order."""
    return db.get(order_id)

# ADK
def lookup_order(order_id: str) -> dict:
    """Look up an order."""
    return db.get(order_id)
```

The function body is identical. The decorator and import change.

## Mixed usage

The `LangchainTool` adapter lets you use a LangChain tool inside an
ADK agent without rewriting. See
[Chapter 16 — LangChain bridge](../16-interop/langchain-langgraph-bridge.md).

## When to stay with LangChain

- The project is a single chain with heavy retrieval.
- The team has deep LangSmith integration.
- You need an integration that is LangChain-only.

## When to migrate

- You are adding a second agent.
- You need voice, computer use, or live.
- You want evaluation as code, not as a SaaS dashboard.
- You are on GCP and want a managed runtime.
