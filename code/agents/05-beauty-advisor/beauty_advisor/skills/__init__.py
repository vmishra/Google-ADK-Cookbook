"""Skills for the beauty advisor.

A *skill* is a unit of expertise the root agent can unlock when the
customer's ask warrants it. Each skill exposes a short *card* (one
paragraph the root can paraphrase to decide) plus a *playbook* (a
longer, fuller instruction the coordinator agent reads only after the
skill has been unlocked).

This is progressive disclosure: the root never sees the full playbook
unless a skill is opened. That keeps the root's context small and
pushes the heavy domain instruction into the coordinator that actually
uses it.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Skill:
    id: str
    title: str
    card: str
    playbook: str


SKILLS: dict[str, Skill] = {
    "skincare-routine": Skill(
        id="skincare-routine",
        title="Skincare routine design",
        card=(
            "Build a morning and evening skincare routine tailored to the "
            "customer's skin type, primary concerns, and sensitivities. "
            "Produces cleanser, treatment, moisturiser, SPF (AM), and "
            "optional add-ons."
        ),
        playbook=(
            "Design a skincare routine in layers. Start from the confirmed "
            "skin type and concerns in profile. Pick one cleanser appropriate "
            "for the type (gel for oily/combo, cream or oil for dry, "
            "sulfate-free non-foaming for sensitive). Add one treatment "
            "aligned with the primary concern — never more than two actives "
            "layered. Always include SPF 30+ in the morning. Budget tier on "
            "the profile controls the brand tier. If 'fragrance-free' is on "
            "ethics, filter accordingly. If 'retinol' is in sensitivities, "
            "never include tretinoin, retinaldehyde, or retinol esters — "
            "use bakuchiol alternatives. Output: AM routine (3–5 steps) "
            "and PM routine (3–6 steps), each step one line, product name "
            "and *why*. No superlatives."
        ),
    ),
    "makeup-base": Skill(
        id="makeup-base",
        title="Makeup base (foundation + complexion)",
        card=(
            "Match a foundation shade and finish to the customer's "
            "undertone and desired coverage. Suggests one primer, one "
            "foundation, one concealer, and a setting step."
        ),
        playbook=(
            "Choose a foundation first from the profile undertone (cool → "
            "shades labelled C/N, warm → W/G, neutral → N). Coverage "
            "defaults to medium unless the customer says 'natural' (→ "
            "light/sheer) or 'full'. Finish: matte for oily skin, satin for "
            "normal, luminous for dry. Pair with a primer that matches the "
            "skin concern (pore-blurring for texture, hydrating for dry, "
            "mattifying for oily). Recommend one concealer a half-shade "
            "lighter than the foundation. Setting: powder for oily, mist "
            "for dry, translucent setting spray for combination."
        ),
    ),
    "haircare-routine": Skill(
        id="haircare-routine",
        title="Haircare routine design",
        card=(
            "Design a washing, conditioning, and styling routine for the "
            "customer's hair type, texture, and concerns."
        ),
        playbook=(
            "Fine or oily hair → wash more frequently with a lightweight "
            "shampoo; condition only on mid-lengths and ends. Thick, coarse, "
            "or curly → wash less often, always condition, add a leave-in "
            "or mask weekly. Colour-treated → sulfate-free shampoo, "
            "colour-safe conditioner. Frizz concern → anti-humectant leave-in "
            "for humid climates, silicone serum or oil for dry climates. "
            "Output: wash cadence, shampoo + conditioner pairing, any "
            "weekly treatment, daily styling step. Short, specific."
        ),
    ),
    "sensitive-skin-safety": Skill(
        id="sensitive-skin-safety",
        title="Sensitive-skin ingredient gate",
        card=(
            "Screen product recommendations against the customer's "
            "sensitivities before returning them."
        ),
        playbook=(
            "Take the list of recommended products. For each, check whether "
            "any of the customer's `sensitivities` appear in its ingredient "
            "tags (we use a mocked ingredient DB). If yes, substitute with "
            "the nearest equivalent that does not contain the flagged "
            "ingredient. State plainly what was swapped and why. Never "
            "silently drop items — the customer must see the swap."
        ),
    ),
    "dupes-and-swaps": Skill(
        id="dupes-and-swaps",
        title="Budget swaps and dupes",
        card=(
            "Find more affordable alternatives to a premium product while "
            "matching the active ingredient and coverage/finish."
        ),
        playbook=(
            "For a given premium product, return two drugstore or mid-range "
            "alternatives. Each must match the primary active ingredient "
            "concentration within ±20% if known, and match coverage/finish "
            "for makeup. State the price delta plainly. Do not claim they "
            "are identical."
        ),
    ),
}


def unlock_skill(skill_id: str) -> dict:
    """Unlock a skill so the relevant coordinator agent reads its full
    playbook on its next turn.

    Args:
        skill_id: one of the registry keys (e.g. "skincare-routine",
            "makeup-base", "haircare-routine", "sensitive-skin-safety",
            "dupes-and-swaps").

    Returns:
        A dict with the skill's title and playbook, plus a short status
        line. The root uses this to decide whether to hand off and to
        seed the coordinator's context.
    """
    skill = SKILLS.get(skill_id)
    if not skill:
        return {"status": "unknown", "note": f"No skill with id '{skill_id}'."}
    return {
        "status": "unlocked",
        "id": skill.id,
        "title": skill.title,
        "playbook": skill.playbook,
    }


def list_skills() -> dict:
    """Return the catalogue of available skills with their short cards.

    The root agent calls this once near the start of a conversation so
    it knows what expertise is available without seeing every playbook.
    """
    return {
        "skills": [
            {"id": s.id, "title": s.title, "card": s.card}
            for s in SKILLS.values()
        ]
    }
