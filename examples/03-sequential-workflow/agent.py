"""Planner → researcher → writer via SequentialAgent."""
import asyncio

from pydantic import BaseModel
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.runners import InMemoryRunner
from google.genai import types


class Plan(BaseModel):
    steps: list[str]
    tone: str


planner = LlmAgent(
    name="planner",
    model="gemini-3.1-pro",
    instruction=(
        "Break the user's question into 3 concrete steps. "
        "Pick a tone: 'technical', 'conversational', or 'formal'. "
        "Return JSON matching the Plan schema."),
    output_schema=Plan,
    output_key="plan",
)

researcher = LlmAgent(
    name="researcher",
    model="gemini-3.1-flash",
    instruction=(
        "For each step in state['plan'].steps, write a two-line note "
        "from your own knowledge. Concatenate into state['notes']."),
    output_key="notes",
)

writer = LlmAgent(
    name="writer",
    model="gemini-3.1-pro",
    instruction=(
        "Using state['plan'] and state['notes'], write a 150-word answer. "
        "Match the tone in state['plan'].tone."),
)


root_agent = SequentialAgent(
    name="deep_answer_pipeline",
    sub_agents=[planner, researcher, writer],
)


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="pipeline")
    s = await runner.session_service.create_session(app_name="pipeline", user_id="u")
    q = "Explain the difference between ADK and LangGraph for a senior engineer."
    print(f"> {q}\n")
    async for e in runner.run_async(
        user_id="u", session_id=s.id,
        new_message=types.Content(role="user", parts=[types.Part(text=q)])):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.text:
                    print(p.text, end="", flush=True)
    print()


if __name__ == "__main__":
    asyncio.run(_main())
