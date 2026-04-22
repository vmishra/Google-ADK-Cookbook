"""Cost-optimised agent: cached prompt, cached tool, confidence gate."""
from google.adk.agents import BaseAgent, LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.genai import types


_tool_cache: dict[tuple, dict] = {}


def lookup_product(sku: str) -> dict:
    """Look up a product by sku."""
    return {"sku": sku, "name": f"Widget {sku}", "price_cents": 1200}


def before_tool(tool, args, ctx):
    if tool.name == "lookup_product":
        key = (tool.name, tuple(sorted(args.items())))
        if key in _tool_cache:
            return _tool_cache[key]


def after_tool(tool, args, ctx, result):
    if tool.name == "lookup_product":
        key = (tool.name, tuple(sorted(args.items())))
        _tool_cache[key] = result
    return result


fast = LlmAgent(
    name="fast",
    model="gemini-3.1-flash",
    instruction=(
        "Answer the user. If you are less than 75% confident, write "
        "state['confidence']=0 (else 1) and keep your answer short."),
    tools=[lookup_product],
    before_tool_callback=before_tool,
    after_tool_callback=after_tool,
    generate_content_config=types.GenerateContentConfig(
        cached_content=True),     # prompt caching
    output_key="fast_answer",
)


fallback = LlmAgent(
    name="fallback",
    model="gemini-3.1-pro",
    instruction=(
        "The fast model was not confident. Using state['fast_answer'] "
        "as a starting point, produce a better answer."),
)


class ConfidenceGate(BaseAgent):
    def __init__(self):
        super().__init__(name="confidence_gate",
                         sub_agents=[fast, fallback],
                         description="Route to Pro if Flash was uncertain.")

    async def _run_async_impl(self, ctx: InvocationContext):
        async for ev in self.sub_agents[0].run_async(ctx):
            yield ev
        if ctx.session.state.get("confidence", 0) < 1:
            async for ev in self.sub_agents[1].run_async(ctx):
                yield ev


root_agent = ConfidenceGate()
