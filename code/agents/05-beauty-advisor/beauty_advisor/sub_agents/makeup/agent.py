"""Makeup coordinator and its base-layer specialists."""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

from ...memory import get_profile
from ...tools import search_makeup


WORKER_MODEL = os.environ.get("BEAUTY_WORKER_MODEL", "gemini-3.1-flash-lite")
COORDINATOR_MODEL = os.environ.get("BEAUTY_COORDINATOR_MODEL", "gemini-3.1-flash")


primer_specialist = LlmAgent(
    name="primer_specialist",
    model=WORKER_MODEL,
    description="Picks a primer matched to skin concern.",
    instruction=(
        "Read profile. Pick one primer via `search_makeup(category='primer', …)`. "
        "Pore-blurring for texture, hydrating for dry skin, mattifying "
        "for oily. Reply with one line: brand, name, price, reason."
    ),
    tools=[get_profile, search_makeup],
    output_key="primer_pick",
)


foundation_specialist = LlmAgent(
    name="foundation_specialist",
    model=WORKER_MODEL,
    description="Picks a foundation matched to undertone, finish, coverage.",
    instruction=(
        "Read profile. Undertone → filter via "
        "`search_makeup(category='foundation', undertone=…)`. Default "
        "finish: matte for oily, satin for normal, luminous for dry. "
        "Default coverage: medium unless the customer said 'natural' "
        "(light) or 'full'. Reply with one line."
    ),
    tools=[get_profile, search_makeup],
    output_key="foundation_pick",
)


setting_specialist = LlmAgent(
    name="setting_specialist",
    model=WORKER_MODEL,
    description="Picks a concealer and a setting step.",
    instruction=(
        "Read profile. Pick a concealer a shade lighter than the "
        "foundation via `search_makeup(category='concealer', …)`. "
        "Pick a setting step: powder for oily, mist for dry, "
        "translucent spray for combination. Two lines."
    ),
    tools=[get_profile, search_makeup],
    output_key="setting_pick",
)


makeup_coordinator = LlmAgent(
    name="makeup_coordinator",
    model=COORDINATOR_MODEL,
    description=(
        "Coordinates a base-makeup recommendation. Delegates to primer, "
        "foundation, and setting specialists."
    ),
    instruction=(
        "For base makeup, call `get_profile` first. If undertone is "
        "unknown, ask one targeted question to establish it rather "
        "than guess. Otherwise call the three specialists "
        "(`primer_specialist`, `foundation_specialist`, "
        "`setting_specialist`) and return four lines: primer, "
        "foundation, concealer, setting step. Brand, product, price, "
        "one reason each. No superlatives."
    ),
    tools=[
        get_profile,
        AgentTool(agent=primer_specialist),
        AgentTool(agent=foundation_specialist),
        AgentTool(agent=setting_specialist),
    ],
)
