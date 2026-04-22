"""Tools the concierge calls. Every external service is mocked here with
realistic fixtures — the LLM loop, reasoning, and tool-selection are real;
the property catalogue, availability, and bookings are not.

The convention is from google/adk-samples: bare Python functions with
typed arguments and a docstring. The docstring is the tool description the
model sees; the arg names + types become the schema.
"""
from __future__ import annotations

import random
import uuid
from datetime import date, timedelta

from google.adk.tools.tool_context import ToolContext


# ---------------------------------------------------------------- catalogue

_ROOMS = {
    "DLX-KING": {
        "name": "Deluxe King",
        "view": "city",
        "size_sqm": 42,
        "rate_inr": 28000,
    },
    "PREM-GARDEN": {
        "name": "Premier Garden Suite",
        "view": "garden",
        "size_sqm": 58,
        "rate_inr": 46000,
    },
    "HERITAGE-SUITE": {
        "name": "Heritage Suite",
        "view": "courtyard",
        "size_sqm": 74,
        "rate_inr": 72000,
    },
    "PRESIDENTIAL": {
        "name": "Presidential Suite",
        "view": "skyline",
        "size_sqm": 140,
        "rate_inr": 185000,
    },
}

_RESTAURANTS = {
    "orchid": {
        "name": "Orchid",
        "cuisine": "modern Indian tasting menu",
        "dress_code": "smart casual",
        "michelin": 1,
    },
    "the-library-bar": {
        "name": "The Library Bar",
        "cuisine": "classic cocktails, small plates",
        "dress_code": "smart casual",
        "michelin": 0,
    },
    "seto": {
        "name": "Seto",
        "cuisine": "Edomae sushi, omakase",
        "dress_code": "formal",
        "michelin": 2,
    },
}

_AMENITIES = [
    {"name": "Spa — Aureum", "hours": "07:00–22:00", "notes": "reservation required"},
    {"name": "Rooftop pool", "hours": "06:30–21:00", "notes": "towels at the cabana"},
    {"name": "Fitness studio", "hours": "24 hours", "notes": "personal trainer on request"},
    {"name": "Club lounge", "hours": "06:00–23:00", "notes": "suite guests and club tier"},
    {"name": "Chauffeur car", "hours": "on request", "notes": "Mercedes S-Class, 2 hours included"},
]


# ---------------------------------------------------------------- tools

def list_rooms() -> dict:
    """Return the hotel's room and suite catalogue.

    Returns:
        A catalogue keyed by room code. Each entry includes the display
        name, the view, the room size in square metres, and the nightly
        rate in INR.
    """
    return {"rooms": _ROOMS}


def check_availability(
    room_code: str,
    check_in: str,
    nights: int,
) -> dict:
    """Check whether a given room is available for the requested dates.

    Args:
        room_code: One of the keys from list_rooms (e.g. "DLX-KING",
            "HERITAGE-SUITE"). Case-sensitive.
        check_in: Check-in date in ISO format (YYYY-MM-DD).
        nights: Number of nights. Must be between 1 and 14.

    Returns:
        A dict with keys: available (bool), room_code, check_in, nights,
        nightly_rate_inr, total_inr, and a human-readable note. For
        unknown room codes returns available=False with a note.
    """
    room = _ROOMS.get(room_code)
    if not room:
        return {
            "available": False,
            "room_code": room_code,
            "note": "Unknown room code. Call list_rooms first.",
        }
    if nights < 1 or nights > 14:
        return {
            "available": False,
            "room_code": room_code,
            "note": "Nights must be between 1 and 14.",
        }
    # Deterministic "availability" based on date hash so replay is stable.
    seed = sum(ord(c) for c in (room_code + check_in))
    random.seed(seed)
    available = random.random() > 0.18
    total = room["rate_inr"] * nights
    return {
        "available": available,
        "room_code": room_code,
        "check_in": check_in,
        "nights": nights,
        "nightly_rate_inr": room["rate_inr"],
        "total_inr": total,
        "note": (
            f"{room['name']} — {room['view']} view, {room['size_sqm']} sqm."
            if available
            else "Fully committed for those dates. Adjacent dates are often open."
        ),
    }


def reserve_room(
    room_code: str,
    check_in: str,
    nights: int,
    guest_name: str,
    tool_context: ToolContext,
) -> dict:
    """Hold a room for a guest. The hold lasts 48 hours before it lapses.

    Args:
        room_code: From list_rooms.
        check_in: ISO date (YYYY-MM-DD).
        nights: 1–14.
        guest_name: Full name on the reservation.

    Returns:
        A dict with the confirmation ID, hold expiry timestamp, and
        summary. On failure (unknown room, date in the past, room not
        available), returns status="declined" with a note.
    """
    avail = check_availability(room_code, check_in, nights)
    if not avail.get("available"):
        return {"status": "declined", **avail}
    confirmation_id = f"HOLD-{uuid.uuid4().hex[:8].upper()}"
    expires_on = (date.today() + timedelta(days=2)).isoformat()
    reservation = {
        "status": "held",
        "confirmation_id": confirmation_id,
        "room_code": room_code,
        "guest_name": guest_name,
        "check_in": check_in,
        "nights": nights,
        "total_inr": avail["total_inr"],
        "hold_expires_on": expires_on,
    }
    holds = tool_context.state.get("holds", [])
    holds.append(reservation)
    tool_context.state["holds"] = holds
    return reservation


def list_restaurants() -> dict:
    """Return the property's in-house restaurants and bars.

    Returns:
        A dict keyed by venue slug. Each entry has name, cuisine,
        dress code, and Michelin star count (0–3).
    """
    return {"venues": _RESTAURANTS}


def book_restaurant(
    venue: str,
    party_size: int,
    when: str,
    guest_name: str,
    tool_context: ToolContext,
) -> dict:
    """Request a table at one of the hotel's restaurants.

    Args:
        venue: A key from list_restaurants (e.g. "seto", "orchid").
        party_size: 1–12.
        when: ISO datetime (YYYY-MM-DDTHH:MM) in local time.
        guest_name: Full name.

    Returns:
        A dict with status="held", confirmation_id, venue, party_size,
        when, and a note about the dress code. Refuses parties above 12.
    """
    v = _RESTAURANTS.get(venue)
    if not v:
        return {"status": "declined", "note": "Unknown venue."}
    if party_size < 1 or party_size > 12:
        return {
            "status": "declined",
            "note": "Parties of 13 or more are arranged privately — ask the concierge to coordinate.",
        }
    confirmation = f"DIN-{uuid.uuid4().hex[:6].upper()}"
    result = {
        "status": "held",
        "confirmation_id": confirmation,
        "venue": v["name"],
        "cuisine": v["cuisine"],
        "party_size": party_size,
        "when": when,
        "guest_name": guest_name,
        "dress_code": v["dress_code"],
        "michelin": v["michelin"],
    }
    bookings = tool_context.state.get("dining", [])
    bookings.append(result)
    tool_context.state["dining"] = bookings
    return result


def list_amenities() -> dict:
    """Return spa, fitness, pool, and transport details."""
    return {"amenities": _AMENITIES}


def recommend_local(interest: str) -> dict:
    """Suggest nearby experiences matching a guest's interest.

    Args:
        interest: A short phrase — e.g. "art galleries", "heritage walk",
            "running route", "late-night music", "child-friendly".

    Returns:
        A dict with a list of suggestions. Each suggestion has a name,
        a one-line description, walking minutes from the hotel, and a
        tag (culture, nature, dining, shopping, nightlife).
    """
    catalogue = {
        "art": [
            {"name": "Kiran Nadar Museum", "desc": "Modern South Asian collection.", "walk_min": 12, "tag": "culture"},
            {"name": "Bikaner House", "desc": "Rotating exhibitions in a restored bungalow.", "walk_min": 8, "tag": "culture"},
        ],
        "heritage": [
            {"name": "Humayun's Tomb grounds", "desc": "Early morning walk before the crowds.", "walk_min": 18, "tag": "culture"},
            {"name": "Nizamuddin qawwali", "desc": "Thursday evenings at the dargah.", "walk_min": 22, "tag": "culture"},
        ],
        "running": [
            {"name": "Lodhi Garden loop", "desc": "Mostly shaded, 3.8 km.", "walk_min": 4, "tag": "nature"},
            {"name": "Sunder Nursery trail", "desc": "Quieter at dawn. 5 km inside the gate.", "walk_min": 14, "tag": "nature"},
        ],
        "music": [
            {"name": "PCO", "desc": "Speakeasy, serious cocktails, late.", "walk_min": 6, "tag": "nightlife"},
            {"name": "Piano Man", "desc": "Live jazz sets, Wed–Sun.", "walk_min": 25, "tag": "nightlife"},
        ],
        "children": [
            {"name": "National Rail Museum", "desc": "Outdoor steam engines, toy train.", "walk_min": 30, "tag": "culture"},
            {"name": "Garden of Five Senses", "desc": "Open lawns, shaded sections.", "walk_min": 28, "tag": "nature"},
        ],
    }
    key = "art" if "art" in interest.lower() else \
          "heritage" if "heritage" in interest.lower() or "walk" in interest.lower() else \
          "running" if "run" in interest.lower() else \
          "music" if "music" in interest.lower() or "night" in interest.lower() else \
          "children" if "child" in interest.lower() or "kid" in interest.lower() else \
          "heritage"
    return {"interest": interest, "suggestions": catalogue[key]}


def current_holds(tool_context: ToolContext) -> dict:
    """Return this session's outstanding room holds and dining reservations.

    Use this to summarise what is on the guest's slate without re-asking.
    """
    return {
        "holds": tool_context.state.get("holds", []),
        "dining": tool_context.state.get("dining", []),
    }
