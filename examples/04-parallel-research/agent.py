"""Three parallel researchers + a merging reviewer."""
import asyncio

from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk.runners import InMemoryRunner
from google.genai import types


# Simulated knowledge-source tools
def web_lookup(query: str) -> dict:
    """Pretend to search the web. Returns two canned bullets."""
    return {"bullets": [
        f"[web] recent article about {query} published today",
        f"[web] popular discussion on {query} in an engineering forum",
    ]}


def kb_lookup(query: str) -> dict:
    """Pretend to search an internal KB. Returns two canned bullets."""
    return {"bullets": [
        f"[kb] internal doc: best practices for {query}",
        f"[kb] runbook: dealing with {query} incidents",
    ]}


def sql_lookup(query: str) -> dict:
    """Pretend to query events DB. Returns two canned bullets."""
    return {"bullets": [
        f"[sql] 3 incidents matching '{query}' in the last 30 days",
        f"[sql] mean time to resolution for {query}: 42 min",
    ]}


web = LlmAgent(name="web", model="gemini-3-flash-preview",
               instruction="Call web_lookup once with the question. Write bullets to state['web'].",
               tools=[web_lookup], output_key="web")

kb = LlmAgent(name="kb", model="gemini-3-flash-preview",
              instruction="Call kb_lookup once with the question. Write bullets to state['kb'].",
              tools=[kb_lookup], output_key="kb")

sql = LlmAgent(name="sql", model="gemini-3-flash-preview",
               instruction="Call sql_lookup once with the question. Write bullets to state['sql'].",
               tools=[sql_lookup], output_key="sql")

fan_out = ParallelAgent(name="fan_out", sub_agents=[web, kb, sql])

reviewer = LlmAgent(
    name="reviewer",
    model="gemini-3.1-pro-preview",
    instruction=(
        "You have state['web'], state['kb'], state['sql']. "
        "Reconcile into a short answer citing each source: [web], [kb], [sql]."),
)

root_agent = SequentialAgent(name="research_review",
                             sub_agents=[fan_out, reviewer])


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="parallel")
    s = await runner.session_service.create_session(app_name="parallel", user_id="u")
    q = "How should we handle database connection pool exhaustion?"
    print(f"> {q}\n")
    async for e in runner.run_async(
        user_id="u", session_id=s.id,
        new_message=types.Content(role="user", parts=[types.Part(text=q)])):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.text: print(p.text, end="", flush=True)
    print()


if __name__ == "__main__":
    asyncio.run(_main())
