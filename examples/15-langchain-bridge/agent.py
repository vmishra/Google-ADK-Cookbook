"""Wrap a LangChain StructuredTool for use inside ADK."""
from langchain.tools import StructuredTool

from google.adk.agents import LlmAgent
from google.adk.tools.langchain_tool import LangchainTool


def search_catalogue(query: str, top_k: int = 3) -> list[str]:
    """Return up to `top_k` product names matching the query."""
    names = ["Desk lamp",  "Standing desk", "Chair mat", "Cable tray"]
    return [n for n in names if query.lower() in n.lower()][:top_k]


lc_tool = StructuredTool.from_function(search_catalogue)
adk_tool = LangchainTool(tool=lc_tool)


root_agent = LlmAgent(
    name="shopping",
    model="gemini-3.1-flash",
    description="Finds products in a small demo catalogue.",
    instruction="Call search_catalogue and return the names briefly.",
    tools=[adk_tool],
)
