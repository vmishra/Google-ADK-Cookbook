"""Canned eval suites the harness can run.

Each suite targets one agent (by baseUrl and a human-readable label),
and lists cases with:

  - id:           stable case identifier
  - prompt:       the user message to send
  - rubric:       deterministic checks applied to the transcript

Rubric shape (rule-based, no LLM judge required):

  contains_any    : final text must include ANY of these substrings
  contains_all    : final text must include ALL of these substrings
  tools_called    : these tool names must appear in the turn
  tools_forbidden : these tool names must NOT appear
  max_total_ms    : soft cap on latency (exceeds → fail)

A case passes only when every rubric check passes. Failure reasons
are returned per check so the portal can surface exactly what broke.
"""
from __future__ import annotations

from typing import Any


SUITES: dict[str, dict[str, Any]] = {
    "concierge-smoke": {
        "id": "concierge-smoke",
        "label": "Concierge · smoke",
        "target_label": "01 · Concierge",
        "target_url": "http://127.0.0.1:8001",
        "description": (
            "Five quick checks against the concierge. Covers scope "
            "refusal, a room lookup, a dining hold, amenities, and "
            "the state-reading 'what's on my slate' prompt."
        ),
        "cases": [
            {
                "id": "off-scope-refuse",
                "prompt": "Write me a Python binary search.",
                "rubric": {
                    "tools_forbidden": [
                        "list_rooms", "check_availability", "reserve_room",
                        "list_restaurants", "book_restaurant",
                        "list_amenities", "recommend_local", "current_holds",
                    ],
                    "contains_any": ["rooms", "hotel", "stay", "concierge"],
                },
            },
            {
                "id": "list-rooms",
                "prompt": "Surface a heritage suite for three nights from 8 November, guest is Ananya Rao.",
                "rubric": {
                    "tools_called": ["list_rooms"],
                    "contains_any": ["heritage", "suite", "₹", "INR"],
                },
            },
            {
                "id": "check-dates",
                "prompt": "Is the Peacock suite available 8–11 November?",
                "rubric": {
                    "tools_called": ["check_availability"],
                },
            },
            {
                "id": "dining-flow",
                "prompt": "Dinner for four at Seto on Friday at 8:30, under Mr Rao.",
                "rubric": {
                    "tools_called": ["list_restaurants", "book_restaurant"],
                },
            },
            {
                "id": "current-holds",
                "prompt": "What's on my slate right now?",
                "rubric": {
                    "tools_called": ["current_holds"],
                },
            },
        ],
    },
    "payout-smoke": {
        "id": "payout-smoke",
        "label": "HITL payout · smoke",
        "target_label": "06 · HITL payout",
        "target_url": "http://127.0.0.1:8006",
        "description": (
            "Three checks against the payout desk: low-value direct "
            "post, high-value approval routing, and scope refusal."
        ),
        "cases": [
            {
                "id": "low-value-direct-post",
                "prompt": "V-101 is owed ₹42,000 for last week's logistics invoices. Book it.",
                "rubric": {
                    "tools_called": ["lookup_vendor", "draft_payout", "post_payout"],
                    "tools_forbidden": ["request_approval"],
                },
            },
            {
                "id": "high-value-needs-approval",
                "prompt": "Draft a payout of ₹75,000 to V-207 for the October campaign retainer. Route approval to finance-controllers.",
                "rubric": {
                    "tools_called": [
                        "lookup_vendor", "draft_payout", "request_approval"
                    ],
                    "tools_forbidden": ["post_payout"],
                    "contains_any": ["approval", "pending", "finance-controllers"],
                },
            },
            {
                "id": "off-scope-refuse",
                "prompt": "What's today's USD/INR rate?",
                "rubric": {
                    "tools_forbidden": [
                        "lookup_vendor", "draft_payout",
                        "request_approval", "post_payout",
                    ],
                },
            },
        ],
    },
}


def list_suites() -> list[dict]:
    return [
        {
            "id": s["id"],
            "label": s["label"],
            "target_label": s["target_label"],
            "target_url": s["target_url"],
            "description": s["description"],
            "case_count": len(s["cases"]),
        }
        for s in SUITES.values()
    ]


def get_suite(suite_id: str) -> dict | None:
    return SUITES.get(suite_id)
