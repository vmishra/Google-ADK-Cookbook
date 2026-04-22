"""Travel planner — a SequentialAgent that walks a brief through three
phases: *plan*, *research (in parallel)*, *compose*. This is the classic
deep-research shape described in the cookbook chapter on multi-agent
workflows and mirrored in google/adk-samples/deep-search.

Flow:

    planner           read the user's brief, extract a structured plan.
                      writes `plan` into session state.
    ┌─ flight_researcher
    │  hotel_researcher          run concurrently — each reads `plan`,
    │  activity_researcher       writes a brief into state.
    └─
    composer          stitches the three briefs into one editorial
                      itinerary the guest can read top to bottom.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from .sub_agents.researchers import parallel_researchers


_LOW_THINKING = BuiltInPlanner(
    thinking_config=genai_types.ThinkingConfig(
        thinking_level=genai_types.ThinkingLevel.LOW,
    ),
)


PRIMARY_MODEL = os.environ.get("PLANNER_MODEL", "gemini-3-flash-preview")


planner = LlmAgent(
    name="planner",
    model=PRIMARY_MODEL,
    description="Reads the guest's brief and extracts a structured plan.",
    instruction=(
        "Read the guest's message. Produce a single JSON object with "
        "keys: origin (IATA), destination (IATA), city (human name), "
        "depart_date (YYYY-MM-DD), return_date (YYYY-MM-DD), nights, "
        "cabin ('economy'|'premium'|'business'), budget_tier "
        "('comfort'|'premium'|'luxury'), interests (comma-separated). "
        "If the guest omitted anything, infer a sensible default and "
        "say so in a 'notes' field. Return only the JSON — no prose."
    ),
    planner=_LOW_THINKING,
    output_key="plan",
)


composer = LlmAgent(
    name="composer",
    model=PRIMARY_MODEL,
    description=(
        "Stitches the flights, hotels, and activities briefs into one "
        "readable itinerary with clear section breaks."
    ),
    instruction=(
        "You have three research briefs in state: `flights_brief`, "
        "`hotels_brief`, `activities_brief`, and the original `plan`. "
        "Write a concise editorial itinerary for the guest. "
        "Structure:\n"
        "  1. A one-paragraph opening that names the city, the dates, "
        "     the total nights, and the style of the trip.\n"
        "  2. A `Flights` section — two sentences plus a two-line table "
        "     of the top two options.\n"
        "  3. A `Stay` section — one recommended hotel, stated plainly, "
        "     with the nightly rate and one alternative.\n"
        "  4. A `Days` section — four to six activities grouped into "
        "     mornings and afternoons, one per line.\n"
        "  5. A short `Notes` section if the plan flagged anything the "
        "     guest should confirm.\n"
        "No exclamation marks. No adjectives like 'amazing', "
        "'unforgettable', 'perfect'. Tabular-aligned prices. Write "
        "the way a senior concierge writes a dossier."
    ),
    planner=_LOW_THINKING,
    output_key="itinerary",
)


root_agent = SequentialAgent(
    name="travel_planner",
    description=(
        "Plans a trip end-to-end: extracts a plan, fans out to parallel "
        "flight/hotel/activity researchers, then composes an itinerary."
    ),
    sub_agents=[planner, parallel_researchers, composer],
)
