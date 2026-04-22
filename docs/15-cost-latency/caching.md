# Caching

<span class="kicker">ch 15 · page 1 of 2</span>

Prompt caching is where the most dramatic cost drops hide. Gemini
bills cached input tokens at a fraction of the uncached rate — and
for a long instruction, the savings are 5-10x.

---

## Enabling prompt caching

```python
from google.genai import types
from google.adk.agents import LlmAgent

root_agent = LlmAgent(
    name="support", model="gemini-3.1-flash",
    instruction=LONG_SHARED_INSTRUCTION,    # 1000+ tokens
    generate_content_config=types.GenerateContentConfig(
        cached_content=True,    # enable caching of the instruction
    ),
)
```

ADK will cache the stable portion of the prompt (system
instruction, tool definitions) and reuse it across invocations.

## What is cacheable

- **System instruction** — stable across calls, always cached.
- **Tool definitions** — stable unless you change tools.
- **Early turns of history** — cache them if the session is long
  enough to be worth it.

What is *not* cacheable: anything that changes per turn (the user's
new message, the last few turns).

## Tool-result caching via callbacks

For deterministic, read-only tools, cache the result:

```python
_tool_cache: dict[tuple, Any] = {}

def before_tool(tool, args, ctx):
    if tool.name in {"lookup_product", "get_exchange_rate"}:
        key = (tool.name, tuple(sorted(args.items())))
        if key in _tool_cache:
            return _tool_cache[key]

def after_tool(tool, args, ctx, result):
    if tool.name in {"lookup_product", "get_exchange_rate"}:
        key = (tool.name, tuple(sorted(args.items())))
        _tool_cache[key] = result
    return result
```

Use a real cache (Redis, Memorystore) for shared state across
instances. In-process is fine for single-instance dev.

## Context compression

Covered in [Chapter 10 — Compaction](../10-memory-patterns/compaction.md).
Summarising old turns reduces the uncached portion the model sees,
which compounds with prompt caching.

## Which lever for which bottleneck

- **High cost per turn, short session.** Model choice + prompt caching.
- **High cost per session, long session.** Compaction.
- **High tool latency.** Tool-result caching.
- **High idle cost.** Scale-to-zero (Agent Engine, Cloud Run).

---

## See also

- `contributing/samples/cache_analysis` — measures the impact of
  cached prompts on your agent.
