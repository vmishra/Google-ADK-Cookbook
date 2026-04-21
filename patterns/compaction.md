# Pattern: Compaction

> Replace old history with a summary when the session grows past a
> threshold.

## When to use

Long conversational sessions — anything over 30-50 turns.

## Runtime compaction (live)

```python
from google.genai import types
from google.adk.agents.run_config import RunConfig

cfg = RunConfig(
    context_window_compression=types.ContextWindowCompressionConfig(
        trigger_tokens=800_000,
        sliding_window=types.SlidingWindow(target_tokens=600_000)))
```

## Application-level compaction (text)

In `after_agent_callback`, if the session's token budget is near a
threshold, run a summariser over the old turns and replace them
with a single event.

## Rules

- Never compact the last 10 turns. Freshness matters more than
  size.
- Preserve every tool-result that influenced a later answer. Make
  the summariser read the full transcript, not a sample.
- Compact *before* approaching the model's limit, not at it.
  You lose a turn if compaction fails mid-generation.

## Anti-patterns

- Compacting every turn. Pure overhead.
- Letting the agent compact its own history. Compaction is a
  platform concern; keep agents unaware of it.
