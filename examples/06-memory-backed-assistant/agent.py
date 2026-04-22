"""A personal assistant that remembers user preferences across sessions."""
import asyncio
import os

from google.adk.agents import LlmAgent
from google.adk.memory import InMemoryMemoryService, VertexAiMemoryBankService
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.load_memory_tool import load_memory_tool
from google.adk.tools.preload_memory_tool import preload_memory_tool
from google.genai import types


def _memory_service():
    engine = os.environ.get("AGENT_ENGINE_ID")
    if engine:
        return VertexAiMemoryBankService(
            project=os.environ["GOOGLE_CLOUD_PROJECT"],
            location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
            agent_engine_id=engine)
    return InMemoryMemoryService()


root_agent = LlmAgent(
    name="personal_assistant",
    model="gemini-3.1-flash",
    instruction=(
        "You are a concise personal assistant. "
        "When the user mentions a preference (diet, hobbies, schedule), "
        "acknowledge it and — when appropriate — call load_memory to see "
        "if they've told you similar things before."),
    tools=[load_memory_tool, preload_memory_tool],
)


async def _main():
    sess_svc = InMemorySessionService()
    mem_svc = _memory_service()
    runner = Runner(agent=root_agent,
                    session_service=sess_svc, memory_service=mem_svc)

    # Turn 1: the user shares a preference.
    s1 = await sess_svc.create_session(app_name="pa", user_id="vikas")
    async for e in runner.run_async(
        user_id="vikas", session_id=s1.id,
        new_message=types.Content(role="user", parts=[types.Part(
            text="I'm vegetarian and I cycle on weekends.")])):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.text: print(p.text, end="", flush=True)
    print()

    # Save to long-term memory.
    completed = await sess_svc.get_session(
        app_name="pa", user_id="vikas", session_id=s1.id)
    await mem_svc.add_session_to_memory(completed)

    # Turn 2: a fresh session. The assistant should recall.
    s2 = await sess_svc.create_session(app_name="pa", user_id="vikas")
    async for e in runner.run_async(
        user_id="vikas", session_id=s2.id,
        new_message=types.Content(role="user", parts=[types.Part(
            text="Any dinner suggestions for tonight?")])):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.text: print(p.text, end="", flush=True)
    print()


if __name__ == "__main__":
    asyncio.run(_main())
