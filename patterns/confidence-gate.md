# Pattern: Confidence gate

> Try the cheap model first. Escalate to the expensive one only if
> the cheap one was unsure.

## When to use

Any workflow where the cheap model's best case is good enough and
its worst case is recoverable by a second pass.

## The shape

A `CustomAgent` composed of `(fast, fallback)`. The fast agent sets
`state['confidence']`. The gate runs the fallback only if below
threshold.

```python
class ConfidenceGate(BaseAgent):
    async def _run_async_impl(self, ctx):
        async for ev in self._fast.run_async(ctx): yield ev
        if ctx.session.state.get("confidence", 0) < self._t:
            async for ev in self._fallback.run_async(ctx): yield ev
```

## Rules

- Measure the real hit rate of "confident" vs "not confident" on a
  representative sample. If the fast model is never confident, the
  gate is pure overhead.
- Threshold sits around 0.7-0.8 for most tasks. Move it based on
  calibration.
- The fast model must *choose* to be unconfident; asking it to rate
  its own certainty is the usual implementation.

## Anti-patterns

- Using a static "confidence" that is really a heuristic ("if the
  output is short, assume low confidence"). The model can just say
  what it thinks.
- Running the fallback in parallel regardless. That defeats the
  purpose.
