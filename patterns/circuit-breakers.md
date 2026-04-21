# Pattern: Circuit breakers

> Stop hammering a failing backend. Re-test cautiously.

## When to use

Any tool that calls a remote system whose failure modes are not
instantaneous timeouts.

## The shape

A plugin counts failures per tool; when the error rate breaches a
threshold, subsequent calls are rejected without invoking the tool.
After a cool-down, a single test call decides whether to close the
breaker.

```python
class CircuitBreakerPlugin(BasePlugin):
    def __init__(self, threshold=0.5, window=30, cool_down=60):
        ...
    async def on_before_run(self, ctx):
        for tool in walk_tools(ctx.agent):
            if self._state[tool.name] == "open":
                raise CircuitOpenError(tool.name)
```

## Rules

- Never share a breaker across tenants. One tenant's bad backend
  should not close circuits for everyone.
- Scope to the tool name + arguments shape when possible. A
  breaker on *"search(query=...)"* that trips on every query is
  probably mis-scoped.
- Record open/close transitions. They are the signal you want in
  incident reviews.

## Anti-patterns

- Opening the breaker on any single failure. Retries are usually
  the right first response.
- Hiding open-breaker errors from the user. Tell them the system
  is degraded; degraded-with-transparency beats silent failure.
