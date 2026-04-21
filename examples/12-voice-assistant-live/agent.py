"""Voice agent using Gemini live native audio."""
from google.adk.agents import LlmAgent
from google.adk.tools.tool_context import ToolContext


def remember_city(city: str, tool_context: ToolContext) -> str:
    """Remember the city the user is asking about."""
    tool_context.state["last_city"] = city
    return f"Remembered {city}"


def get_weather(city: str) -> dict:
    return {"Seattle": {"tempC": 14, "sky": "cloudy"},
            "Bengaluru": {"tempC": 28, "sky": "hazy"}}.get(
        city, {"tempC": None, "sky": "unknown"})


root_agent = LlmAgent(
    name="voice_assistant",
    model="gemini-live-2.5-flash-native-audio",  # Vertex path
    description="A calm, brief voice assistant.",
    instruction=(
        "You answer aloud, briefly, in a calm tone. "
        "For weather, call remember_city then get_weather."),
    tools=[remember_city, get_weather],
)
