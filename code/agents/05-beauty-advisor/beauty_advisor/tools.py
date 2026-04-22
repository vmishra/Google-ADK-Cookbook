"""Mocked product catalogues for the beauty advisor.

Three namespaces — skincare, makeup, haircare — each with a small
realistic catalogue keyed by product id. The search tools take a
semantic query and return plausibly-shaped results.
"""
from __future__ import annotations

import hashlib
import random


def _rng(key: str) -> random.Random:
    return random.Random(int(hashlib.sha256(key.encode()).hexdigest()[:12], 16))


# ----------------------------------------------------------------- skincare

_SKINCARE = [
    # cleansers
    {"id": "clns-01", "brand": "CeraVe", "name": "Hydrating Facial Cleanser", "category": "cleanser", "subtype": "cream", "tier": "drugstore", "price_inr": 950, "actives": [], "tags": ["fragrance-free", "sensitive-safe"]},
    {"id": "clns-02", "brand": "La Roche-Posay", "name": "Toleriane Caring Wash", "category": "cleanser", "subtype": "cream", "tier": "mid-range", "price_inr": 1250, "actives": [], "tags": ["fragrance-free", "sensitive-safe"]},
    {"id": "clns-03", "brand": "Paula's Choice", "name": "Resist Perfectly Balanced Cleanser", "category": "cleanser", "subtype": "gel", "tier": "mid-range", "price_inr": 2100, "actives": [], "tags": ["fragrance-free"]},
    {"id": "clns-04", "brand": "Kiehl's", "name": "Ultra Facial Cleanser", "category": "cleanser", "subtype": "cream", "tier": "luxury", "price_inr": 2600, "actives": [], "tags": []},
    # treatments
    {"id": "trt-01", "brand": "The Ordinary", "name": "Niacinamide 10% + Zinc 1%", "category": "treatment", "subtype": "serum", "tier": "drugstore", "price_inr": 650, "actives": ["niacinamide"], "tags": ["fragrance-free"]},
    {"id": "trt-02", "brand": "The Ordinary", "name": "Azelaic Acid Suspension 10%", "category": "treatment", "subtype": "serum", "tier": "drugstore", "price_inr": 850, "actives": ["azelaic acid"], "tags": ["fragrance-free"]},
    {"id": "trt-03", "brand": "Paula's Choice", "name": "2% BHA Liquid Exfoliant", "category": "treatment", "subtype": "exfoliant", "tier": "mid-range", "price_inr": 2850, "actives": ["salicylic acid"], "tags": ["fragrance-free"]},
    {"id": "trt-04", "brand": "Drunk Elephant", "name": "A-Passioni Retinol Cream", "category": "treatment", "subtype": "retinoid", "tier": "luxury", "price_inr": 6500, "actives": ["retinol"], "tags": []},
    {"id": "trt-05", "brand": "Herbivore", "name": "Bakuchiol Serum", "category": "treatment", "subtype": "retinoid-alternative", "tier": "mid-range", "price_inr": 3200, "actives": ["bakuchiol"], "tags": ["fragrance-free", "vegan"]},
    # moisturisers
    {"id": "mst-01", "brand": "Neutrogena", "name": "Hydro Boost Water Gel", "category": "moisturiser", "subtype": "gel", "tier": "drugstore", "price_inr": 750, "actives": ["hyaluronic acid"], "tags": []},
    {"id": "mst-02", "brand": "CeraVe", "name": "Moisturising Cream", "category": "moisturiser", "subtype": "cream", "tier": "drugstore", "price_inr": 1200, "actives": ["ceramides"], "tags": ["fragrance-free", "sensitive-safe"]},
    {"id": "mst-03", "brand": "Augustinus Bader", "name": "The Cream", "category": "moisturiser", "subtype": "cream", "tier": "luxury", "price_inr": 22000, "actives": ["tfc8"], "tags": []},
    # spf
    {"id": "spf-01", "brand": "La Roche-Posay", "name": "Anthelios UV Mune 400", "category": "spf", "subtype": "fluid", "tier": "mid-range", "price_inr": 2200, "actives": ["mexoryl 400"], "tags": ["fragrance-free"]},
    {"id": "spf-02", "brand": "Beauty of Joseon", "name": "Relief Sun: Rice + Probiotics", "category": "spf", "subtype": "fluid", "tier": "drugstore", "price_inr": 900, "actives": ["zinc oxide"], "tags": []},
    {"id": "spf-03", "brand": "Supergoop!", "name": "Unseen Sunscreen SPF 40", "category": "spf", "subtype": "gel", "tier": "luxury", "price_inr": 3800, "actives": [], "tags": []},
]

_MAKEUP = [
    # primers
    {"id": "prm-01", "brand": "Milk Makeup", "name": "Hydro Grip Primer", "category": "primer", "tier": "mid-range", "price_inr": 3400, "tags": ["vegan"]},
    {"id": "prm-02", "brand": "Benefit", "name": "The POREfessional", "category": "primer", "tier": "mid-range", "price_inr": 3200, "tags": []},
    # foundations
    {"id": "fnd-01", "brand": "Fenty Beauty", "name": "Pro Filt'r Soft Matte", "category": "foundation", "finish": "matte", "coverage": "medium-to-full", "undertones": ["cool", "warm", "neutral"], "tier": "mid-range", "price_inr": 3600, "tags": ["cruelty-free"]},
    {"id": "fnd-02", "brand": "NARS", "name": "Light Reflecting Foundation", "category": "foundation", "finish": "luminous", "coverage": "light-to-medium", "undertones": ["cool", "warm", "neutral"], "tier": "luxury", "price_inr": 5800, "tags": []},
    {"id": "fnd-03", "brand": "Maybelline", "name": "Fit Me Matte + Poreless", "category": "foundation", "finish": "matte", "coverage": "medium", "undertones": ["warm", "neutral"], "tier": "drugstore", "price_inr": 750, "tags": []},
    {"id": "fnd-04", "brand": "Armani", "name": "Luminous Silk", "category": "foundation", "finish": "satin", "coverage": "light-to-medium", "undertones": ["cool", "warm", "neutral"], "tier": "luxury", "price_inr": 7200, "tags": []},
    # concealers
    {"id": "cnc-01", "brand": "NARS", "name": "Radiant Creamy Concealer", "category": "concealer", "tier": "luxury", "price_inr": 3400, "tags": []},
    {"id": "cnc-02", "brand": "Maybelline", "name": "Instant Age Rewind", "category": "concealer", "tier": "drugstore", "price_inr": 750, "tags": []},
    # setting
    {"id": "set-01", "brand": "Laura Mercier", "name": "Translucent Loose Setting Powder", "category": "setting", "tier": "luxury", "price_inr": 4200, "tags": []},
    {"id": "set-02", "brand": "Urban Decay", "name": "All Nighter Setting Spray", "category": "setting", "tier": "mid-range", "price_inr": 3000, "tags": ["cruelty-free"]},
]

_HAIRCARE = [
    {"id": "shm-01", "brand": "Olaplex", "name": "No. 4 Bond Maintenance Shampoo", "category": "shampoo", "tier": "luxury", "price_inr": 2800, "tags": ["colour-safe", "sulfate-free"]},
    {"id": "shm-02", "brand": "Pantene", "name": "Pro-V Daily Moisture Renewal", "category": "shampoo", "tier": "drugstore", "price_inr": 450, "tags": []},
    {"id": "shm-03", "brand": "K18", "name": "Peptide Prep pH Maintenance", "category": "shampoo", "tier": "luxury", "price_inr": 2400, "tags": ["colour-safe"]},
    {"id": "cnd-01", "brand": "Olaplex", "name": "No. 5 Bond Maintenance Conditioner", "category": "conditioner", "tier": "luxury", "price_inr": 2800, "tags": ["colour-safe"]},
    {"id": "cnd-02", "brand": "Kerastase", "name": "Nutritive Nectar Thermique", "category": "conditioner", "tier": "luxury", "price_inr": 3800, "tags": []},
    {"id": "trt-h1", "brand": "Olaplex", "name": "No. 3 Hair Perfector", "category": "treatment", "tier": "luxury", "price_inr": 2800, "tags": ["colour-safe"]},
    {"id": "stl-01", "brand": "Moroccanoil", "name": "Treatment Original", "category": "styling", "subtype": "oil", "tier": "luxury", "price_inr": 3600, "tags": []},
    {"id": "stl-02", "brand": "Living Proof", "name": "No Frizz Humidity Shield", "category": "styling", "subtype": "spray", "tier": "luxury", "price_inr": 3400, "tags": []},
]


# ---------- search primitives used by specialists

def _tier_match(item: dict, tier: str | None) -> bool:
    if not tier:
        return True
    return item.get("tier") == tier


def _filter_sensitivities(items: list[dict], sensitivities: list[str]) -> list[dict]:
    safe = []
    for i in items:
        blocked = False
        for s in sensitivities:
            if s in i.get("actives", []) or s in i.get("tags", []):
                blocked = True
                break
        if not blocked:
            safe.append(i)
    return safe


def search_skincare(
    category: str,
    skin_type: str | None = None,
    tier: str | None = None,
    sensitivities: str | None = None,
) -> dict:
    """Return skincare products matching a category.

    Args:
        category: cleanser / treatment / moisturiser / spf.
        skin_type: filter: dry / oily / combination / sensitive / normal.
        tier: drugstore / mid-range / luxury.
        sensitivities: comma-separated ingredients/tags to exclude.
    """
    items = [i for i in _SKINCARE if i["category"] == category and _tier_match(i, tier)]
    if skin_type == "sensitive":
        items = [i for i in items if "sensitive-safe" in i.get("tags", [])]
    if sensitivities:
        items = _filter_sensitivities(items, [s.strip().lower() for s in sensitivities.split(",")])
    return {"category": category, "count": len(items), "items": items[:5]}


def search_makeup(
    category: str,
    undertone: str | None = None,
    coverage: str | None = None,
    finish: str | None = None,
    tier: str | None = None,
) -> dict:
    """Return makeup products matching a category.

    Args:
        category: primer / foundation / concealer / setting.
        undertone: cool / warm / neutral.
        coverage: light / medium / full.
        finish: matte / satin / luminous.
        tier: drugstore / mid-range / luxury.
    """
    items = [i for i in _MAKEUP if i["category"] == category and _tier_match(i, tier)]
    if category == "foundation":
        if undertone:
            items = [i for i in items if undertone.lower() in i.get("undertones", [])]
        if coverage:
            items = [i for i in items if coverage.lower() in i.get("coverage", "")]
        if finish:
            items = [i for i in items if i.get("finish") == finish.lower()]
    return {"category": category, "count": len(items), "items": items[:5]}


def search_haircare(
    category: str,
    hair_type: str | None = None,
    texture: str | None = None,
    concern: str | None = None,
    tier: str | None = None,
) -> dict:
    """Return haircare products matching a category.

    Args:
        category: shampoo / conditioner / treatment / styling.
        hair_type: fine / medium / thick.
        texture: straight / wavy / curly / coily.
        concern: frizz / dryness / colour-treated.
        tier: drugstore / mid-range / luxury.
    """
    items = [i for i in _HAIRCARE if i["category"] == category and _tier_match(i, tier)]
    if concern == "colour-treated":
        items = [i for i in items if "colour-safe" in i.get("tags", [])]
    return {"category": category, "count": len(items), "items": items[:5]}


def find_dupes(product_id: str) -> dict:
    """Find cheaper alternatives to a product by matching its category
    and, where applicable, its active ingredient.
    """
    src = next(
        (i for all_list in (_SKINCARE, _MAKEUP, _HAIRCARE) for i in all_list if i["id"] == product_id),
        None,
    )
    if not src:
        return {"status": "unknown", "note": f"No product with id {product_id}."}
    actives = set(src.get("actives", []))
    tier_rank = {"drugstore": 0, "mid-range": 1, "luxury": 2}
    src_rank = tier_rank.get(src.get("tier", "mid-range"), 1)
    pool = _SKINCARE + _MAKEUP + _HAIRCARE
    candidates = [
        i for i in pool
        if i["category"] == src["category"]
        and i["id"] != src["id"]
        and tier_rank.get(i.get("tier", ""), 1) < src_rank
        and (not actives or set(i.get("actives", [])) & actives)
    ]
    candidates.sort(key=lambda i: i["price_inr"])
    return {"source": src, "dupes": candidates[:3]}
