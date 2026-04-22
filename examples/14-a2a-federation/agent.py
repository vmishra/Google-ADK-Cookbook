"""Root agent that federates to a remote SRE agent over A2A."""
import os

from google.adk.agents import LlmAgent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent


SRE_CARD_URL = os.environ.get(
    "SRE_AGENT_CARD",
    "http://localhost:8001/a2a/sre_incident_agent/.well-known/agent-card")


sre = RemoteA2aAgent(
    name="sre",
    agent_card=SRE_CARD_URL,
)


root_agent = LlmAgent(
    name="root",
    model="gemini-3.1-flash",
    description="Top-level agent that routes incident questions to SRE.",
    instruction=(
        "For anything about outages, alerts, or runbooks, transfer to sre. "
        "Handle everything else yourself."),
    sub_agents=[sre],
)
