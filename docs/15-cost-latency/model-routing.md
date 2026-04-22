# Model routing

<span class="kicker">ch 15 · page 2 of 2</span>

The model is the biggest cost lever. Pick it consciously, and route
between tiers when it pays off.

---

## Tiers

| Model | Strength | Typical use |
|---|---|---|
| `gemini-3.1-flash` | Fast, cheap, good at tool calling | Default for every agent |
| `gemini-3.1-pro` | Reasoning, instruction following | Planning, synthesis, final write |
| `gemini-3.1-flash-lite` (where available) | Lowest cost | Classifiers, simple routers |
| `gemini-live-2.5-flash-native-audio` | Audio in/out | Voice agents |
| `gemini-2.5-computer-use-preview-10-2025` | Browser operation | Computer use |

## Split pipelines by tier

In a sequential workflow:

```python
planner    = LlmAgent(model="gemini-3.1-pro",   ...)
researcher = LlmAgent(model="gemini-3.1-flash", ...)
writer     = LlmAgent(model="gemini-3.1-pro",   ...)
```

Planning and writing benefit from Pro; searching is Flash. Cost
drops 3-4x versus all-Pro with barely a quality regression.

## Confidence routing

Try Flash first; fall back to Pro if the result is low-confidence.

```python
class ConfidenceGate(BaseAgent):
    def __init__(self, name, fast, fallback, threshold=0.75):
        super().__init__(name=name, sub_agents=[fast, fallback])
        self._fast, self._fallback, self._t = fast, fallback, threshold

    async def _run_async_impl(self, ctx):
        async for ev in self._fast.run_async(ctx): yield ev
        if ctx.session.state.get("confidence", 0.0) < self._t:
            async for ev in self._fallback.run_async(ctx): yield ev
```

The fast model writes `state["confidence"]`. If below threshold,
the fallback runs.

## LiteLLM for cross-vendor

```python
from google.adk.models.lite_llm import LiteLlm

agent = LlmAgent(
    name="cross",
    model=LiteLlm(model="openai/gpt-4o", fallbacks=["anthropic/claude-sonnet-4-6"]),
    tools=[...])
```

Use cases: meeting a customer contract that mandates a non-Google
model, or cross-vendor redundancy.

## Fallback models

`LiteLlm` supports ordered fallbacks. If the primary errors or
rate-limits, the next is tried. See
`contributing/samples/litellm_with_fallback_models`.

## Latency budgets

Rough rules for a text agent:

- Token per second: ~40 tokens/s for Pro, ~150 tokens/s for Flash.
- Tool call overhead: 200-500ms per round trip to the tool.
- Web search grounding: +400-800ms per search.

For live voice: a 500-900ms end-to-end echo budget is achievable.
Any tool call inside a live session adds 400ms-1s.

---

## See also

- `contributing/samples/litellm_*`, `hello_world_litellm`,
  `hello_world_anthropic`, `hello_world_ollama`.
