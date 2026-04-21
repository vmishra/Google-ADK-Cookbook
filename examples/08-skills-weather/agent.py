"""Weather assistant using the Agent Skill spec."""
import asyncio
import pathlib

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.adk.skills import load_skill_from_dir
from google.adk.tools.skill_toolset import SkillToolset
from google.adk.tools.tool_context import ToolContext
from google.genai import types


DB = {"Seattle": {"tempC": 14, "sky": "cloudy", "wind_kmh": 12},
      "Bengaluru": {"tempC": 28, "sky": "hazy", "wind_kmh": 8},
      "London": {"tempC": 11, "sky": "drizzle", "wind_kmh": 18}}


def get_weather(city: str, tool_context: ToolContext) -> dict:
    """Return current conditions for a city."""
    tool_context.state["last_city"] = city
    return DB.get(city, {"tempC": None, "sky": "unknown"})


weather_skill = load_skill_from_dir(
    pathlib.Path(__file__).parent / "skills" / "weather")


root_agent = LlmAgent(
    name="assistant",
    model="gemini-2.5-pro",
    instruction="Follow the weather skill when the user's question is weather-related.",
    tools=[SkillToolset(skills=[weather_skill], tools=[get_weather])],
)


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="weather_skill")
    s = await runner.session_service.create_session(
        app_name="weather_skill", user_id="u")
    for q in ["Weather in Seattle?", "And how does that feel in Fahrenheit?"]:
        print(f"\n> {q}")
        async for e in runner.run_async(
            user_id="u", session_id=s.id,
            new_message=types.Content(role="user", parts=[types.Part(text=q)])):
            if e.content and e.content.parts:
                for p in e.content.parts:
                    if p.text: print(p.text, end="", flush=True)
        print()


if __name__ == "__main__":
    asyncio.run(_main())
