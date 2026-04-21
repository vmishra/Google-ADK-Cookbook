# Pattern: Session rewind

> Re-run a conversation from turn N with a different model, prompt,
> or tool set.

## When to use

- Investigation: "did the old behaviour happen because of the
  prompt change, or the model change?"
- Recovery: "the model hallucinated — let me try again at that
  turn without destroying the session."
- Cost analysis: "replay last week's traffic on a cheaper model."

## The shape

```python
session = await svc.get_session(...)
truncated = session.model_copy(update={"history": session.history[:n]})
await svc.update_session(truncated)
# now run_async from that point
```

## Rules

- Only `VertexAiSessionService` and `DatabaseSessionService` give
  you durable rewind. `InMemory` does not.
- Rewind **does not** roll back side effects. If the original
  session issued a refund, the refund stays issued. Rewind is a
  tool for understanding, not for undoing.
- Keep rewind behind a role-gated surface. Users should not rewind
  each other's sessions.

## Anti-patterns

- Using rewind as a UX feature ("tap to go back three turns"). It
  is not cheap enough for that — a rewind re-runs the model from
  scratch.
- Using rewind when a fresh session would do. Fresh sessions have
  clean state.
