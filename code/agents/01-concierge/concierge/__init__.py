"""Concierge — a luxury hotel concierge agent.

The package exports `root_agent` so `adk run .`, `adk web`, and our own
FastAPI server can all discover the same agent.
"""
from . import agent  # noqa: F401
from .agent import root_agent  # noqa: F401
