"""Production-ready agent with external services and platform plugins."""
import os

from google.adk.agents import LlmAgent
from google.adk.memory import VertexAiMemoryBankService
from google.adk.plugins.base_plugin import BasePlugin
from google.adk.runners import Runner
from google.adk.sessions import VertexAiSessionService
from google.adk.tools.tool_context import ToolContext


# --- Tools ----------------------------------------------------------------

def lookup_user(user_id: str, tool_context: ToolContext) -> dict:
    tool_context.state["temp:last_lookup"] = user_id
    return {"ok": True, "user_id": user_id, "tier": "gold"}


# --- Agent ----------------------------------------------------------------

root_agent = LlmAgent(
    name="production_agent",
    model="gemini-2.5-flash",
    description="Production template.",
    instruction=(
        "You are a production agent. Call lookup_user when needed. "
        "Be concise and respect the user's tier."),
    tools=[lookup_user],
)


# --- Platform plugins -----------------------------------------------------

class TenantStampPlugin(BasePlugin):
    async def on_before_run(self, ctx):
        tenant = os.environ.get("TENANT", "default")
        ctx.session.state["user:tenant"] = tenant


class AuditPlugin(BasePlugin):
    async def on_event(self, ctx, event):
        # Replace with a real sink (BigQuery, Loki, etc.).
        pass


# --- Runner factory -------------------------------------------------------

def build_runner() -> Runner:
    project = os.environ["GOOGLE_CLOUD_PROJECT"]
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    engine = os.environ["AGENT_ENGINE_ID"]
    return Runner(
        agent=root_agent,
        session_service=VertexAiSessionService(
            project=project, location=location, agent_engine_id=engine),
        memory_service=VertexAiMemoryBankService(
            project=project, location=location, agent_engine_id=engine),
        plugins=[TenantStampPlugin(), AuditPlugin()],
    )
