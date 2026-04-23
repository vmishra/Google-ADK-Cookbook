"""Credit bureau scoring tool.

A deterministic, seed-based stand-in for a real bureau. Given a PAN
and a requested loan size, returns a 300–900 score, a set of flags
the bureau would raise, and a short narrative line.

Nothing here persists; the bureau is idempotent per (pan, amount).
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone


def _seeded(pan: str, salt: str) -> float:
    """Map a PAN + salt to a float in [0, 1) deterministically."""
    h = hashlib.sha256(f"{pan.upper()}::{salt}".encode()).digest()
    n = int.from_bytes(h[:8], "big")
    return (n % 1_000_000) / 1_000_000


def score_credit(
    pan: str,
    requested_amount_inr: int,
    existing_obligations_inr: int = 0,
) -> dict:
    """Return a bureau-style credit report for a PAN.

    Args:
        pan: The applicant's PAN (10-character alphanumeric).
        requested_amount_inr: The loan size the applicant is asking for.
        existing_obligations_inr: Their current monthly EMI outflow.
            Bureau treats this as a proxy for existing leverage.

    Returns:
        {
          "pan": str,
          "score": int,               # 300–900, higher is better
          "bureau": "BharatCredit",
          "tier": "prime" | "near-prime" | "sub-prime",
          "dpd_30_plus_12m": int,     # delinquencies in last 12 months
          "utilisation_pct": int,     # revolving utilisation
          "inquiries_6m": int,
          "flags": [str, ...],
          "narrative": str,           # one-line summary
          "pulled_at": iso8601,
        }
    """
    base = _seeded(pan, "base")            # 0..1, stable per PAN
    noise = _seeded(pan, "utilisation")    # 0..1
    inquiries_noise = _seeded(pan, "inq")  # 0..1
    dpd_noise = _seeded(pan, "dpd")

    # Score 480..840, centred so most applicants are "near-prime".
    score = int(480 + base * 360)

    # Penalise heavy leverage.
    leverage = 0
    if requested_amount_inr and existing_obligations_inr:
        leverage = min(
            200,
            int((existing_obligations_inr * 12 / max(1, requested_amount_inr)) * 120),
        )
    score = max(320, score - leverage)

    utilisation_pct = int(35 + noise * 55)  # 35..90
    inquiries_6m = int(inquiries_noise * 6)
    dpd_30_plus_12m = int(dpd_noise * 3)

    flags: list[str] = []
    if utilisation_pct > 80:
        flags.append("revolving_utilisation_over_80pct")
    if inquiries_6m >= 4:
        flags.append("hard_inquiries_ge_4_in_6m")
    if dpd_30_plus_12m >= 2:
        flags.append("multiple_30dpd_in_12m")
    if existing_obligations_inr * 12 > requested_amount_inr * 0.8:
        flags.append("existing_leverage_high_vs_ask")

    if score >= 760:
        tier = "prime"
    elif score >= 680:
        tier = "near-prime"
    else:
        tier = "sub-prime"

    if tier == "prime":
        narrative = (
            f"Clean file — score {score}, utilisation {utilisation_pct}%, "
            f"{inquiries_6m} inquiries in the last six months."
        )
    elif tier == "near-prime":
        narrative = (
            f"Mixed profile — score {score}, utilisation {utilisation_pct}%, "
            f"{dpd_30_plus_12m} 30+ dpd episodes in the trailing year."
        )
    else:
        narrative = (
            f"Elevated risk — score {score}, utilisation {utilisation_pct}%, "
            f"leverage ratio suggests a tighter ticket size."
        )

    return {
        "pan": pan.upper(),
        "score": score,
        "bureau": "BharatCredit",
        "tier": tier,
        "dpd_30_plus_12m": dpd_30_plus_12m,
        "utilisation_pct": utilisation_pct,
        "inquiries_6m": inquiries_6m,
        "flags": flags,
        "narrative": narrative,
        "pulled_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
