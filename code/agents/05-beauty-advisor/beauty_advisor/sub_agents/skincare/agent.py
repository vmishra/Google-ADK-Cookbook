"""Skincare coordinator and its three specialist sub-agents.

Shape:

    skincare_coordinator                  reads profile, decides which
    │                                     specialists to invoke, composes
    │                                     the final routine.
    ├── cleanser_specialist
    ├── treatment_specialist              each is an LlmAgent that reads
    └── moisturiser_spf_specialist        profile and writes its picks into
                                          session state.

Specialists are exposed as `AgentTool`s on the coordinator — the
coordinator can call them like tools, and the model decides which to
call and in what order.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

from ...memory import get_profile
from ...tools import search_skincare


WORKER_MODEL = os.environ.get("BEAUTY_WORKER_MODEL", "gemini-3.1-flash-lite-preview")
COORDINATOR_MODEL = os.environ.get("BEAUTY_COORDINATOR_MODEL", "gemini-3-flash-preview")


cleanser_specialist = LlmAgent(
    name="cleanser_specialist",
    model=WORKER_MODEL,
    description="Picks a cleanser matched to skin type and sensitivities.",
    instruction=(
        "Read the customer's profile via `get_profile`. Pick exactly "
        "one cleanser via `search_skincare(category='cleanser', …)`. "
        "Gel formulas for oily/combination, cream for dry, "
        "sulfate-free non-foaming for sensitive. If the profile "
        "lists fragrance in sensitivities, filter via the tool's "
        "`sensitivities` argument. Reply with one line: brand, "
        "product name, price in INR, and the single reason you chose it."
    ),
    tools=[get_profile, search_skincare],
    output_key="cleanser_pick",
)


treatment_specialist = LlmAgent(
    name="treatment_specialist",
    model=WORKER_MODEL,
    description=(
        "Picks a treatment step (serum, exfoliant, or retinoid) matched "
        "to the customer's primary concern."
    ),
    instruction=(
        "Read the profile. Map the primary concern to one active "
        "ingredient: acne → BHA or azelaic acid; hyperpigmentation → "
        "niacinamide or azelaic acid; fine lines → retinol unless "
        "profile.skin.sensitivities contains 'retinol', in which case "
        "use bakuchiol. Call `search_skincare(category='treatment', …)`. "
        "Reply with one line: the product and why this active fits."
    ),
    tools=[get_profile, search_skincare],
    output_key="treatment_pick",
)


moisturiser_spf_specialist = LlmAgent(
    name="moisturiser_spf_specialist",
    model=WORKER_MODEL,
    description="Picks a moisturiser and a morning SPF.",
    instruction=(
        "Read the profile. Pick a moisturiser via "
        "`search_skincare(category='moisturiser', …)`: gel for oily, "
        "cream for dry, lightweight lotion for combination. Pick an "
        "SPF 30+ via `search_skincare(category='spf', …)`. Prefer "
        "fluid/gel finishes for oily skin; cream for dry. "
        "Reply with two lines: moisturiser, SPF."
    ),
    tools=[get_profile, search_skincare],
    output_key="base_pick",
)


skincare_coordinator = LlmAgent(
    name="skincare_coordinator",
    model=COORDINATOR_MODEL,
    description=(
        "Coordinates a full skincare routine. Calls the three skincare "
        "specialists and composes AM and PM routines."
    ),
    instruction=(
        "When the customer asks for a skincare routine, first read the "
        "profile with `get_profile`. If `skin.type` or the primary "
        "concern is missing, ask one targeted clarifying question "
        "instead of guessing. Once you have enough, call the three "
        "specialists (`cleanser_specialist`, `treatment_specialist`, "
        "`moisturiser_spf_specialist`) and compose two routines:\n\n"
        "  AM — cleanser, moisturiser, SPF.\n"
        "  PM — cleanser, treatment, moisturiser.\n\n"
        "Use short lines. No adjectives. Name each product with brand "
        "and price. If any substitution was made for a sensitivity, "
        "state it plainly."
    ),
    tools=[
        get_profile,
        AgentTool(agent=cleanser_specialist),
        AgentTool(agent=treatment_specialist),
        AgentTool(agent=moisturiser_spf_specialist),
    ],
)
