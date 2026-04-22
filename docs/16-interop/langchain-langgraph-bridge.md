# LangChain / LangGraph bridge

<span class="kicker">ch 16 · page 3 of 3</span>

Two common cases: you have LangChain tools you like and you want to
use them in ADK, or you have a LangGraph workflow and you want to
federate with it.

---

## LangChain tool → ADK tool

ADK ships a `LangchainTool` adapter.

```python
from google.adk.tools.langchain_tool import LangchainTool
from langchain.tools import YouTubeSearchTool

yt = LangchainTool(tool=YouTubeSearchTool())

agent = LlmAgent(
    model="gemini-3-flash-preview",
    tools=[yt],
    instruction="Find relevant YouTube videos.")
```

The `langchain_youtube_search_agent` and
`langchain_structured_tool_agent` samples in `google/adk-python` are
the canonical references.

## LangChain `StructuredTool` → ADK

```python
from langchain.tools import StructuredTool

def search(query: str, top_k: int = 5) -> list[str]:
    ...

lc_tool = StructuredTool.from_function(search)
adk_tool = LangchainTool(tool=lc_tool)
```

The pydantic argument schema carries through — the model sees the
same arg shape.

## CrewAI tool → ADK

```python
from google.adk.tools.crewai_tool import CrewaiTool
from crewai_tools import SerperDevTool

adk_tool = CrewaiTool(tool=SerperDevTool())
```

See `contributing/samples/crewai_tool_kwargs`.

## Wrapping an ADK agent for LangChain

Easiest path: expose the ADK agent via A2A and consume it from
LangChain as a remote tool. Direct in-process wrapping is possible
but rarely worth it — the process boundary makes session isolation
and evaluation cleaner.

## Wrapping an ADK agent for LangGraph

Same: expose as A2A, consume with LangGraph's HTTP-based agent
caller. LangGraph workflows that talk to ADK sub-agents across A2A
are a legitimate production pattern.

## When to reach for the bridge

- You have a LangChain tool with non-trivial logic you do not want
  to rewrite.
- You have a CrewAI crew for a narrow task and want to embed it as
  a capability in a larger ADK system.
- You are incrementally migrating from LangChain to ADK — keep the
  tools while you rewrite the runtime.

## When not to

- The LangChain tool is trivial — rewriting as a function tool is
  faster and cleaner.
- You need deep integration with ADK's `ToolContext` — LangChain
  tools see a reduced context.

---

## Chapter recap

Three interop lanes: MCP for tools, A2A for agents, LangChain
adapters when direct is cheaper than protocol. Together they
make ADK a framework you can adopt without abandoning everything
else.

Next: [Chapter 17 — Comparisons](../17-comparisons/index.md).
