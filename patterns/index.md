# Patterns

A catalogue of recurring design patterns for ADK. Each pattern is
one page: when to use it, the shape, and a counter-pattern.

| Pattern | Covers |
|---|---|
| [Context engineering](context-engineering.md) | How to construct the prompt the model actually sees |
| [Session rewind](session-rewind.md) | Replay + re-run with different config |
| [Compaction](compaction.md) | Long-session cost control |
| [Circuit breakers](circuit-breakers.md) | Failing fast against unreliable backends |
| [Confidence gate](confidence-gate.md) | Flash-first, Pro-fallback routing |
| [Harness plugin composition](harness-plugin-composition.md) | Stacking plugins for a platform |

Patterns are terse. If a pattern is unfamiliar, read the
corresponding chapter first.
