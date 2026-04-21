"""Computer-use agent with domain allowlist and destructive-click gate."""
from urllib.parse import urlparse

from google.adk.agents import Agent
from google.adk.tools.computer_use.computer_use_toolset import ComputerUseToolset

# In real use, import your PlaywrightComputer implementation.
# See contributing/samples/computer_use/playwright.py in adk-python.
try:
    from .playwright_computer import PlaywrightComputer  # type: ignore
except ImportError:
    PlaywrightComputer = None  # type: ignore


ALLOWED_DOMAINS = {"news.ycombinator.com", "en.wikipedia.org"}
DESTRUCTIVE_KEYWORDS = {"delete", "deactivate", "cancel subscription", "remove"}


def before_tool(tool, args, ctx):
    if tool.name == "navigate":
        host = urlparse(args.get("url", "")).hostname or ""
        if not any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS):
            return {"ok": False, "reason": f"domain blocked: {host}"}
    if tool.name == "click":
        target = (ctx.state.get("temp:last_click_target") or "").lower()
        if any(k in target for k in DESTRUCTIVE_KEYWORDS):
            if not ctx.state.get("approved_destructive"):
                return {"ok": False, "reason": "destructive click needs approval"}
    return None


def build_agent():
    if PlaywrightComputer is None:
        raise RuntimeError(
            "PlaywrightComputer not found — copy the implementation from "
            "contributing/samples/computer_use/playwright.py in adk-python.")
    return Agent(
        model="gemini-2.5-computer-use-preview-10-2025",
        name="computer_use_agent",
        description="Operates a browser within an allowlisted domain set.",
        instruction=(
            "You operate a real browser. Narrate each step briefly. "
            "Stay within the allowed domains. "
            "Stop and ask for approval before clicking any element whose "
            "label includes delete, deactivate, cancel, or remove."),
        tools=[ComputerUseToolset(
            computer=PlaywrightComputer(
                screen_size=(1280, 936),
                profile_name="browser_profile_for_adk_demo"))],
        before_tool_callback=before_tool,
    )


root_agent = None if PlaywrightComputer is None else build_agent()
