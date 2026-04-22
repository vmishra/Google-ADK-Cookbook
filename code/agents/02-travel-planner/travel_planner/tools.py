"""Mocked search tools for the travel-planner deep-research pipeline.

Each returns realistic, structured fixtures — flights, hotels, activities.
Randomness is seeded by the query so a given prompt yields stable results
across reruns (important for demos).
"""
from __future__ import annotations

import hashlib
import random
from datetime import date, timedelta


def _seed(query: str) -> random.Random:
    h = hashlib.sha256(query.encode()).hexdigest()
    return random.Random(int(h[:12], 16))


# ----------------------------------------------------------- flights

_CARRIERS = [
    ("AI", "Air India"),
    ("EK", "Emirates"),
    ("SQ", "Singapore Airlines"),
    ("LH", "Lufthansa"),
    ("BA", "British Airways"),
    ("QR", "Qatar Airways"),
]


def search_flights(
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    cabin: str = "economy",
) -> dict:
    """Search return flights between two IATA codes on the given dates.

    Args:
        origin: IATA code, e.g. "DEL".
        destination: IATA code, e.g. "LIS".
        depart_date: ISO date.
        return_date: ISO date.
        cabin: One of "economy", "premium", "business".

    Returns:
        A dict with a list of `options`. Each option has airline, flight
        numbers outbound/return, stops, duration minutes, and fare in INR.
    """
    rng = _seed(f"fl|{origin}|{destination}|{depart_date}|{return_date}|{cabin}")
    base = {"economy": 62000, "premium": 120000, "business": 240000}[cabin]
    options = []
    for _ in range(5):
        carrier = rng.choice(_CARRIERS)
        stops = rng.choice([0, 0, 1, 1, 2])
        duration = 7 * 60 + rng.randint(0, 9 * 60) + stops * 90
        fare = int(base * rng.uniform(0.85, 1.4))
        options.append({
            "airline": carrier[1],
            "carrier": carrier[0],
            "outbound": f"{carrier[0]}{rng.randint(100, 999)}",
            "inbound": f"{carrier[0]}{rng.randint(100, 999)}",
            "stops": stops,
            "duration_min": duration,
            "fare_inr": fare,
            "cabin": cabin,
        })
    options.sort(key=lambda o: o["fare_inr"])
    return {
        "origin": origin,
        "destination": destination,
        "depart": depart_date,
        "return": return_date,
        "options": options,
    }


# ----------------------------------------------------------- hotels

def search_hotels(
    city: str,
    check_in: str,
    nights: int,
    budget_tier: str = "premium",
) -> dict:
    """Search hotels in a city.

    Args:
        city: Destination city (human name, e.g. "Lisbon").
        check_in: ISO date.
        nights: 1–21.
        budget_tier: One of "comfort", "premium", "luxury".

    Returns:
        A dict with a list of `options`, each with name, neighbourhood,
        walk minutes to the old town, rating (0–5), and nightly rate
        in INR.
    """
    rng = _seed(f"ho|{city}|{check_in}|{nights}|{budget_tier}")
    tier_min = {"comfort": 6000, "premium": 16000, "luxury": 42000}[budget_tier]
    neighbourhoods = [
        "Chiado", "Alfama", "Príncipe Real", "Avenida", "Baixa", "Bairro Alto",
    ] if city.lower() == "lisbon" else [
        "central", "old town", "riverside", "garden district", "museum quarter",
    ]
    adjectives = [
        "Heritage", "Casa", "Hotel", "Inn", "House", "Villa", "Residence",
    ]
    options = []
    for _ in range(5):
        nightly = int(tier_min * rng.uniform(0.85, 2.4))
        options.append({
            "name": f"{rng.choice(adjectives)} {rng.choice(['Dória', 'do Chiado', 'Amália', 'Pessoa', 'Estrela'])}",
            "neighbourhood": rng.choice(neighbourhoods),
            "walk_min_to_centre": rng.randint(2, 22),
            "rating": round(rng.uniform(4.1, 4.9), 1),
            "nightly_rate_inr": nightly,
            "total_inr": nightly * nights,
            "tier": budget_tier,
        })
    options.sort(key=lambda o: -o["rating"])
    return {
        "city": city,
        "check_in": check_in,
        "nights": nights,
        "options": options,
    }


# ----------------------------------------------------------- activities

def search_activities(
    city: str,
    interests: str,
) -> dict:
    """Find activities and experiences in a city that match interests.

    Args:
        city: The destination.
        interests: Comma-separated cues, e.g. "food, architecture,
            quiet mornings". The tool uses these to colour the
            suggestions but will not filter strictly — pass what the
            guest actually said.

    Returns:
        A dict with a list of `options`, each with name, short
        description, category, duration hours, and indicative cost in
        INR per person.
    """
    rng = _seed(f"ac|{city}|{interests}")
    catalogue = {
        "food": [
            ("Time Out Market walkthrough", "All the city's best cooks, one lunch hour.", 2, 2500),
            ("Ginjinha cellar tasting", "Four cherry-liqueur varieties with a historian.", 1, 1800),
            ("Tram 28 with Campo de Ourique pit stop", "Neighbourhood bakery crawl.", 3, 3000),
        ],
        "architecture": [
            ("Jerónimos Monastery private dawn", "45 minutes before the gates open to the public.", 2, 6500),
            ("Belém Tower & MAAT twin-visit", "Manueline to Manuel Aires Mateus in one afternoon.", 3, 3500),
            ("Alfama azulejo walk", "Three tile ateliers with the curator.", 2, 2800),
        ],
        "quiet": [
            ("Estrela garden & basilica", "Slow morning with pastéis.", 2, 1200),
            ("Sunset at Miradouro da Senhora do Monte", "Park bench, no itinerary.", 2, 0),
        ],
        "art": [
            ("Gulbenkian collection", "Private docent, two hours.", 2, 4800),
            ("Underdogs gallery + Lx Factory", "Contemporary urban practice.", 3, 2200),
        ],
    }
    picked = []
    cues = [c.strip().lower() for c in interests.split(",")]
    for cue in cues:
        for key, items in catalogue.items():
            if key in cue:
                picked.extend(items[:2])
    if not picked:
        picked = catalogue["architecture"][:2] + catalogue["food"][:1]
    rng.shuffle(picked)
    options = [
        {"name": n, "desc": d, "duration_hr": h, "cost_inr_pp": c}
        for n, d, h, c in picked[:6]
    ]
    return {"city": city, "interests": interests, "options": options}
