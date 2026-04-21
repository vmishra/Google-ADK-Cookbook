"""Run a CrewAI tool inside an ADK agent."""
from google.adk.agents import LlmAgent

try:
    from crewai_tools import SerperDevTool
    from google.adk.tools.crewai_tool import CrewaiTool
    _crew_tool = CrewaiTool(tool=SerperDevTool())
except Exception:  # Missing deps; keep file loadable
    _crew_tool = None


root_agent = LlmAgent(
    name="search",
    model="gemini-2.5-flash",
    description="Web search via a CrewAI tool.",
    instruction="Call the Serper tool to search the web. Quote 3 results.",
    tools=[_crew_tool] if _crew_tool else [],
)
