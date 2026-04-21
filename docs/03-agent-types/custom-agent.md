# Custom agent

<span class="kicker">ch 03 · page 5 of 5</span>

When none of the built-in types fits, subclass `BaseAgent`. This is
rarer than it sounds — most branching fits neatly into a callback on
an `LlmAgent`. Reach for a custom agent when *the control flow
itself* is the novel part.

---

## Example: round-robin delegator

Cycles through sub-agents turn by turn. Useful for evenly loading a
set of worker agents.

```python
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event


class RoundRobinAgent(BaseAgent):
    def __init__(self, name: str, sub_agents: list[BaseAgent]):
        super().__init__(name=name, sub_agents=sub_agents, description="Round-robin delegator")

    async def _run_async_impl(self, ctx: InvocationContext):
        turn = ctx.session.state.get(f"rr:{self.name}", 0)
        chosen = self.sub_agents[turn % len(self.sub_agents)]
        yield Event(
            author=self.name,
            invocation_id=ctx.invocation_id,
            actions=Event.make_actions(state_delta={f"rr:{self.name}": turn + 1}),
        )
        async for ev in chosen.run_async(ctx):
            yield ev
```

## Example: confidence gate

Only runs the expensive agent if the cheap one is unsure.

```python
class ConfidenceGate(BaseAgent):
    def __init__(self, name, fast: BaseAgent, fallback: BaseAgent, threshold: float = 0.75):
        super().__init__(name=name, sub_agents=[fast, fallback])
        self._fast, self._fallback, self._t = fast, fallback, threshold

    async def _run_async_impl(self, ctx):
        async for ev in self._fast.run_async(ctx):
            yield ev
        conf = ctx.session.state.get("fast_confidence", 0.0)
        if conf < self._t:
            async for ev in self._fallback.run_async(ctx):
                yield ev
```

## Rules

- **Yield events, do not return.** `_run_async_impl` is an async
  generator.
- **Write `state_delta` through `Event.actions`**, not directly on
  `ctx.session.state`. The service persists via the event log.
- **Do not swallow exceptions silently.** Raise — the runner has a
  plan for them (plugins, tracing, retries).
- **Prefer composition over custom.** If you find yourself writing
  *"it runs agent A, then if X, agent B, else agent C"*, that is
  usually a parent `LlmAgent` with sub-agents and a
  `before_agent_callback`.

---

## Chapter recap

Five agent types. All satisfy `BaseAgent`. All nest. The shape of
an ADK project is always *an agent that contains agents that contain
tools that touch state and memory*.

Next: [Chapter 4 — Tools](../04-tools/index.md) goes deep on the
tool side of that picture.
