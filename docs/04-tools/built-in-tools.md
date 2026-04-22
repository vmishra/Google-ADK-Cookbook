# Built-in tools

<span class="kicker">ch 04 · page 4 of 6</span>

ADK ships a small set of pre-built tools for operations the
framework treats as first-class: web search, Vertex RAG, memory
access, and code execution.

---

## `google_search`

Grounded web search using Google Search as the retriever. The model
sees the search results as a structured tool response.

```python
from google.adk.agents import LlmAgent
from google.adk.tools import google_search

root_agent = LlmAgent(
    name="researcher",
    model="gemini-3-flash-preview",
    instruction="Answer factually. Use google_search when you are not sure.",
    tools=[google_search],
)
```

Citations appear automatically in `event.grounding_metadata`. Use
them in the UI to show sources.

## `VertexAiRagRetrieval`

Retrieval against a Vertex AI RAG corpus. Pre-indexed by you; the
agent calls this tool to fetch relevant chunks.

```python
from google.adk.tools.retrieval.vertex_ai_rag_retrieval import VertexAiRagRetrieval
from vertexai.preview import rag
import os

docs_tool = VertexAiRagRetrieval(
    name="company_docs",
    description="Search the company's internal documentation.",
    similarity_top_k=5,
    vector_distance_threshold=0.6,
    rag_resources=[rag.RagResource(rag_corpus=os.environ["RAG_CORPUS"])],
)

root_agent = LlmAgent(model="gemini-3-flash-preview", tools=[docs_tool])
```

## `load_memory_tool` and `preload_memory_tool`

Read long-term memory on demand or eagerly. See
[Chapter 2 — Memory](../02-core-concepts/memory.md) and
[Chapter 10](../10-memory-patterns/index.md).

```python
from google.adk.tools.load_memory_tool import load_memory_tool
from google.adk.tools.preload_memory_tool import preload_memory_tool

agent = LlmAgent(model="gemini-3-flash-preview",
                 tools=[load_memory_tool, preload_memory_tool])
```

## Code executors

Not tools in the narrow sense — they are attached to the agent via
`code_executor=` and allow the model to emit Python that runs in a
sandbox.

```python
from google.adk.code_executors.agent_engine_sandbox_code_executor import (
    AgentEngineSandboxCodeExecutor)

root_agent = LlmAgent(
    name="data_scientist",
    model="gemini-3.1-pro-preview",
    instruction="Answer with pandas code where appropriate.",
    code_executor=AgentEngineSandboxCodeExecutor(
        project="my-project", location="us-central1"),
)
```

Four executors ship today:

- `AgentEngineSandboxCodeExecutor` — Vertex AI managed sandbox.
- `VertexAiCodeExecutor` — legacy managed path.
- `UnsafeLocalCodeExecutor` — in-process `exec`. Never production.
- `ContainerCodeExecutor` — runs code in a Docker container you
  control.

## `EnvironmentToolset`

Exposes a filesystem and shell to the agent, through an
`Environment` object. Useful for agents that manipulate files
(scaffolders, linters).

```python
from google.adk.environment import LocalEnvironment
from google.adk.tools.environment import EnvironmentToolset

env = LocalEnvironment(workdir="./workspace")
root_agent = LlmAgent(
    name="scaffolder",
    model="gemini-3.1-pro-preview",
    tools=[EnvironmentToolset(env)],
)
```

See `contributing/samples/local_environment*` for full examples.

---

## When to prefer built-ins

- **`google_search`** — any time you want fresh facts and do not
  have a KB of your own.
- **`VertexAiRagRetrieval`** — when your data is indexed on Vertex
  and fits the RAG-corpus shape.
- **`load/preload_memory_tool`** — any long-term agent.
- **Code executors** — data analysis, math, anything where running
  the computation is cheaper and more accurate than asking the model
  to do it in its head.

---

## See also

- [`examples/11-deep-research`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/11-deep-research)
  uses `google_search`.
- `contributing/samples/rag_agent`, `code_execution`,
  `local_environment_skill`.
