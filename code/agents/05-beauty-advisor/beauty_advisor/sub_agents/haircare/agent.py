"""Haircare coordinator and its wash / condition / styling specialists."""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.adk.tools.agent_tool import AgentTool
from google.genai import types as genai_types

from ...memory import get_profile
from ...tools import search_haircare


_LOW_THINKING = BuiltInPlanner(
    thinking_config=genai_types.ThinkingConfig(
        thinking_level=genai_types.ThinkingLevel.LOW,
    ),
)

_MINIMAL_THINKING = BuiltInPlanner(
    thinking_config=genai_types.ThinkingConfig(
        thinking_level=genai_types.ThinkingLevel.MINIMAL,
    ),
)


WORKER_MODEL = os.environ.get("BEAUTY_WORKER_MODEL", "gemini-3.1-flash-lite-preview")
COORDINATOR_MODEL = os.environ.get("BEAUTY_COORDINATOR_MODEL", "gemini-3-flash-preview")


wash_specialist = LlmAgent(
    name="wash_specialist",
    model=WORKER_MODEL,
    description="Picks a shampoo and conditioner pairing.",
    instruction=(
        "Read profile. Call `search_haircare(category='shampoo', …)` and "
        "`search_haircare(category='conditioner', …)`. Colour-treated → "
        "sulfate-free and colour-safe. Fine/oily → lightweight. "
        "Thick/dry → hydrating. Two lines."
    ),
    tools=[get_profile, search_haircare],
    planner=_MINIMAL_THINKING,
    output_key="wash_pick",
)


treatment_specialist = LlmAgent(
    name="hair_treatment_specialist",
    model=WORKER_MODEL,
    description="Picks an optional weekly treatment (bond repair, mask).",
    instruction=(
        "Read profile. If concerns include colour-treated, dryness, or "
        "damage, recommend a weekly bond or mask treatment via "
        "`search_haircare(category='treatment', …)`. Otherwise return "
        "'no weekly treatment needed'. One line."
    ),
    tools=[get_profile, search_haircare],
    planner=_MINIMAL_THINKING,
    output_key="treatment_pick",
)


styling_specialist = LlmAgent(
    name="styling_specialist",
    model=WORKER_MODEL,
    description="Picks a daily styling step for the hair concern.",
    instruction=(
        "Read profile. Humidity/frizz → anti-humectant spray or leave-in. "
        "Dryness → oil or serum. Call "
        "`search_haircare(category='styling', …)`. One line."
    ),
    tools=[get_profile, search_haircare],
    planner=_MINIMAL_THINKING,
    output_key="styling_pick",
)


haircare_coordinator = LlmAgent(
    name="haircare_coordinator",
    model=COORDINATOR_MODEL,
    description=(
        "Coordinates a haircare routine. Delegates to wash, treatment, "
        "and styling specialists."
    ),
    planner=_LOW_THINKING,
    instruction=(
        "Call `get_profile`. If hair type or texture is unknown, ask one "
        "question. Otherwise call the three specialists "
        "(`wash_specialist`, `hair_treatment_specialist`, "
        "`styling_specialist`). Compose: wash cadence (e.g. 3× weekly), "
        "the shampoo + conditioner pairing, any weekly treatment, and "
        "the daily styling step. Four short lines."
    ),
    tools=[
        get_profile,
        AgentTool(agent=wash_specialist),
        AgentTool(agent=treatment_specialist),
        AgentTool(agent=styling_specialist),
    ],
)
