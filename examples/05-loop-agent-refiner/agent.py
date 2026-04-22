"""LoopAgent that refines a draft until the critic is satisfied."""
import asyncio

from google.adk.agents import LlmAgent, LoopAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.runners import InMemoryRunner
from google.genai import types


def stop_if_approved(cc: CallbackContext):
    if cc.state.get("critique_passed"):
        cc.event_actions.escalate = True


drafter_and_critic = LlmAgent(
    name="drafter_and_critic",
    model="gemini-3.1-pro",
    instruction=(
        "You maintain state['draft'] and state['critique_passed']. "
        "Step 1: if state['draft'] is empty, write a first draft. "
        "Step 2: critique the draft for clarity and factuality. "
        "Step 3: if the draft is clean, set state['critique_passed']=True. "
        "Otherwise, rewrite state['draft'] and leave critique_passed=False."),
    after_agent_callback=stop_if_approved,
    output_key="draft",
)


root_agent = LoopAgent(
    name="refine_until_good",
    sub_agent=drafter_and_critic,
    max_iterations=4,
)


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="refine")
    s = await runner.session_service.create_session(app_name="refine", user_id="u")
    q = "Write a 60-word product announcement for a local farmers-market app."
    print(f"> {q}\n")
    async for e in runner.run_async(
        user_id="u", session_id=s.id,
        new_message=types.Content(role="user", parts=[types.Part(text=q)])):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.text: print(p.text, end="", flush=True)
    print()
    final = (await runner.session_service.get_session(
        app_name="refine", user_id="u", session_id=s.id)).state.get("draft", "")
    print("\nFINAL DRAFT:\n" + (final or "(empty)"))


if __name__ == "__main__":
    asyncio.run(_main())
