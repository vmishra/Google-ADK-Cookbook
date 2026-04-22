# Compaction

<span class="kicker">ch 10 · page 3 of 3</span>

Long sessions get expensive. Compaction is the technique of replacing
old turns with a summary while keeping recent ones verbatim. ADK
exposes it in two places: the runtime (context-window compression in
live sessions) and the application layer (explicit summary tools).

---

## Runtime compression for live sessions

```python
from google.adk.agents.run_config import RunConfig
from google.genai import types

cfg = RunConfig(
    response_modalities=["TEXT"],
    context_window_compression=types.ContextWindowCompressionConfig(
        trigger_tokens=800_000,
        sliding_window=types.SlidingWindow(target_tokens=600_000),
    ),
)
```

When the model's context approaches `trigger_tokens`, ADK asks the
runtime to compress toward `target_tokens`. The model sees the
compression as a summarisation turn in its own history.

## Application-level compaction

For text sessions you drive with `run_async`, do the compaction
yourself when a session crosses a threshold. A pattern:

```python
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext


async def compact_if_long(cc: CallbackContext):
    history = cc._invocation_context.session.history
    if sum(len(e.content_as_text() or "") for e in history) < 120_000:
        return

    summariser = LlmAgent(
        name="compactor", model="gemini-3-flash-preview",
        instruction="Summarise the conversation so far in 300 words, "
                    "preserving every fact the user asked us to remember.")
    summary = await run_and_collect(summariser, history[:-10])

    # Replace all but the last 10 turns with the summary
    new_history = [summary_event(summary)] + history[-10:]
    await cc._invocation_context.session_service.update_session(
        cc._invocation_context.session.model_copy(update={"history": new_history}))
```

Attach as `after_agent_callback`. The exact threshold depends on
your model and budget.

## State compaction

Unbounded growth also happens in session state. If a tool appends
to a list without a cap, state grows forever. Apply a cap:

```python
def append_capped(tool_context, key, value, max_len=50):
    lst = tool_context.state.get(key, [])
    lst.append(value)
    tool_context.state[key] = lst[-max_len:]
```

Or store the appended data as artifacts and keep only references in
state.

## Memory compaction

Long-running assistants accumulate memories. Periodically:

- Delete low-confidence or contradicted memories.
- Merge duplicates.
- Summarise clusters of small memories into larger ones.

`VertexAiMemoryBankService` does the first two automatically.
Cluster-summary compaction is an application-level job — run it on
a cron against the memory bank's API.

---

## Why compaction matters

A 50-turn session with every turn preserved costs roughly 5× what a
compacted 50-turn session costs. Over a week of support traffic,
compaction is the single highest-leverage cost optimisation
available.

---

## See also

- [Chapter 15 — Caching](../15-cost-latency/caching.md) — complementary
  cost lever.
- `contributing/samples/history_management`, `cache_analysis`.
