"""Three parallel researchers. Each runs the same shape: an LlmAgent
with one mocked search tool, a tight instruction, and an `output_key` so
the result lands in session state for the composer to read.

The ParallelAgent runs them concurrently — there is no ordering between
flights, hotels, and activities, and the LLM calls can overlap.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent, ParallelAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from ..tools import search_activities, search_flights, search_hotels


WORKER_MODEL = os.environ.get("PLANNER_WORKER_MODEL", "gemini-3.1-flash-lite-preview")


# MINIMAL is the canonical pairing for Flash-Lite — enough thinking to
# read the plan and pick the right tool args, no more. Matches Google's
# own Flash-Lite samples.
_MINIMAL_THINKING = BuiltInPlanner(
    thinking_config=genai_types.ThinkingConfig(
        thinking_level=genai_types.ThinkingLevel.MINIMAL,
    ),
)


flight_researcher = LlmAgent(
    name="flight_researcher",
    model=WORKER_MODEL,
    description="Finds flight options between two airports on given dates.",
    instruction=(
        "Read the plan in state under key 'plan'. Extract origin, "
        "destination, depart date, return date, and cabin preference. "
        "Call `search_flights` once with those values, then summarise "
        "the three most relevant options in a short markdown list: "
        "airline, stops, duration (h m), and fare in INR with tabular "
        "spacing. No superlatives. If the plan does not specify cabin, "
        "default to economy."
    ),
    tools=[search_flights],
    planner=_MINIMAL_THINKING,
    output_key="flights_brief",
)

hotel_researcher = LlmAgent(
    name="hotel_researcher",
    model=WORKER_MODEL,
    description="Finds hotel options in the destination city.",
    instruction=(
        "Read the plan in state under key 'plan'. Extract the city, "
        "check-in date, number of nights, and budget tier. Call "
        "`search_hotels` once, then report the top three hotels as a "
        "short markdown list: name, neighbourhood, walk to centre, "
        "rating, and nightly rate in INR. Prefer higher rating over "
        "lower cost within the same tier."
    ),
    tools=[search_hotels],
    planner=_MINIMAL_THINKING,
    output_key="hotels_brief",
)

activity_researcher = LlmAgent(
    name="activity_researcher",
    model=WORKER_MODEL,
    description="Proposes activities and experiences matched to interests.",
    instruction=(
        "Read the plan in state under key 'plan'. Extract the city and "
        "the interests. Call `search_activities` once. Return four to "
        "six items as a short markdown list, each a single line: the "
        "name in bold, the description, and duration + cost (if any). "
        "No adjectives like 'amazing' or 'unforgettable'."
    ),
    tools=[search_activities],
    planner=_MINIMAL_THINKING,
    output_key="activities_brief",
)


parallel_researchers = ParallelAgent(
    name="parallel_researchers",
    description=(
        "Runs the flights, hotels, and activities researchers "
        "concurrently. Each writes its brief into session state."
    ),
    sub_agents=[flight_researcher, hotel_researcher, activity_researcher],
)
