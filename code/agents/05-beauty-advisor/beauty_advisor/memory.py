"""Memory management for the beauty advisor.

Two layers:

- **Session state** (`tool_context.state`) — the live conversation's
  shared context. Every sub-agent reads and writes this.
- **Long-term profile** (`tool_context.state["profile"]`) — the
  customer's stable skin / hair / tone attributes. We model it as a
  typed dict that `remember_*` tools fill incrementally.

A real deployment would back this with `VertexAiMemoryBankService` and
the `load_memory` tool. For the workshop we keep it in-session so the
demo runs without a Vertex project. The tool shapes mirror what a
memory-bank-backed implementation would expose.
"""
from __future__ import annotations

from google.adk.tools.tool_context import ToolContext


DEFAULT_PROFILE: dict = {
    "skin": {
        "type": None,          # "dry" | "oily" | "combination" | "sensitive" | "normal"
        "concerns": [],        # ["acne", "hyperpigmentation", "fine lines", …]
        "sensitivities": [],   # ["fragrance", "retinol", "essential oils"]
        "undertone": None,     # "cool" | "warm" | "neutral"
    },
    "hair": {
        "type": None,          # "fine" | "medium" | "thick"
        "texture": None,       # "straight" | "wavy" | "curly" | "coily"
        "concerns": [],        # ["frizz", "dryness", "colour-treated"]
    },
    "preferences": {
        "budget_tier": None,   # "drugstore" | "mid-range" | "luxury"
        "routine_complexity": None,   # "minimal" | "moderate" | "elaborate"
        "ethics": [],          # ["cruelty-free", "fragrance-free", "vegan"]
        "favourite_brands": [],
        "avoid_brands": [],
    },
}


def _ensure_profile(tc: ToolContext) -> dict:
    if "profile" not in tc.state:
        tc.state["profile"] = {
            "skin": dict(DEFAULT_PROFILE["skin"], concerns=[], sensitivities=[]),
            "hair": dict(DEFAULT_PROFILE["hair"], concerns=[]),
            "preferences": dict(
                DEFAULT_PROFILE["preferences"],
                ethics=[],
                favourite_brands=[],
                avoid_brands=[],
            ),
        }
    return tc.state["profile"]


def remember_skin(
    skin_type: str | None = None,
    concerns: str | None = None,
    sensitivities: str | None = None,
    undertone: str | None = None,
    tool_context: ToolContext | None = None,
) -> dict:
    """Record skin attributes on the customer profile. Partial updates only.

    Args:
        skin_type: one of dry / oily / combination / sensitive / normal.
        concerns: comma-separated list, e.g. "acne, hyperpigmentation".
        sensitivities: comma-separated list of ingredients to avoid.
        undertone: cool / warm / neutral.
    """
    assert tool_context is not None
    p = _ensure_profile(tool_context)
    if skin_type:
        p["skin"]["type"] = skin_type.lower().strip()
    if concerns:
        p["skin"]["concerns"] = [c.strip().lower() for c in concerns.split(",") if c.strip()]
    if sensitivities:
        p["skin"]["sensitivities"] = [s.strip().lower() for s in sensitivities.split(",") if s.strip()]
    if undertone:
        p["skin"]["undertone"] = undertone.lower().strip()
    return {"status": "ok", "skin": p["skin"]}


def remember_hair(
    hair_type: str | None = None,
    texture: str | None = None,
    concerns: str | None = None,
    tool_context: ToolContext | None = None,
) -> dict:
    """Record hair attributes. Same partial-update semantics as remember_skin."""
    assert tool_context is not None
    p = _ensure_profile(tool_context)
    if hair_type:
        p["hair"]["type"] = hair_type.lower().strip()
    if texture:
        p["hair"]["texture"] = texture.lower().strip()
    if concerns:
        p["hair"]["concerns"] = [c.strip().lower() for c in concerns.split(",") if c.strip()]
    return {"status": "ok", "hair": p["hair"]}


def remember_preferences(
    budget_tier: str | None = None,
    routine_complexity: str | None = None,
    ethics: str | None = None,
    favourite_brands: str | None = None,
    avoid_brands: str | None = None,
    tool_context: ToolContext | None = None,
) -> dict:
    """Record shopping preferences on the profile.

    Args:
        budget_tier: drugstore / mid-range / luxury.
        routine_complexity: minimal / moderate / elaborate.
        ethics: comma-separated: cruelty-free, fragrance-free, vegan…
        favourite_brands: comma-separated list.
        avoid_brands: comma-separated list.
    """
    assert tool_context is not None
    p = _ensure_profile(tool_context)
    if budget_tier:
        p["preferences"]["budget_tier"] = budget_tier.lower().strip()
    if routine_complexity:
        p["preferences"]["routine_complexity"] = routine_complexity.lower().strip()
    if ethics:
        p["preferences"]["ethics"] = [e.strip().lower() for e in ethics.split(",") if e.strip()]
    if favourite_brands:
        p["preferences"]["favourite_brands"] = [b.strip() for b in favourite_brands.split(",") if b.strip()]
    if avoid_brands:
        p["preferences"]["avoid_brands"] = [b.strip() for b in avoid_brands.split(",") if b.strip()]
    return {"status": "ok", "preferences": p["preferences"]}


def get_profile(tool_context: ToolContext) -> dict:
    """Return the customer's full profile assembled so far.

    Use this at the start of any specialist sub-agent's turn — it's the
    cheapest way to share context across the hierarchy.
    """
    return _ensure_profile(tool_context)


def clear_profile(tool_context: ToolContext) -> dict:
    """Wipe the profile. Useful when the customer asks to start over."""
    tool_context.state["profile"] = {
        "skin": {"type": None, "concerns": [], "sensitivities": [], "undertone": None},
        "hair": {"type": None, "texture": None, "concerns": []},
        "preferences": {
            "budget_tier": None,
            "routine_complexity": None,
            "ethics": [],
            "favourite_brands": [],
            "avoid_brands": [],
        },
    }
    return {"status": "cleared"}
