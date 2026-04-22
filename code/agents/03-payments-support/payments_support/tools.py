"""Mocked payments back-office tools for the voice support agent.

These look and feel like the shape of a real payments company's
internal APIs: transaction lookup by reference, refund initiation,
dispute filing, card block. Calls are deterministic so demos replay.
"""
from __future__ import annotations

import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone

from google.adk.tools.tool_context import ToolContext


# ---------- deterministic seeding so demo replays match

def _rng(key: str) -> random.Random:
    return random.Random(int(hashlib.sha256(key.encode()).hexdigest()[:12], 16))


# ---------- tools

def lookup_transaction(reference: str) -> dict:
    """Look up a transaction by its reference code.

    Args:
        reference: The reference the customer reads back — e.g.
            "TXN-PF-8812" or a 10-digit authorisation code. Case
            insensitive.

    Returns:
        A dict with the transaction's status, merchant, amount in INR,
        card last-four, timestamp, and whether it is eligible for a
        one-click refund. If no transaction matches, returns
        status="unknown" and a note.
    """
    ref = reference.strip().upper()
    if not ref or len(ref) < 4:
        return {"status": "unknown", "note": "Reference is too short — ask the customer to re-read."}
    rng = _rng(ref)
    merchant = rng.choice([
        "Uniqlo India", "BigBasket", "MakeMyTrip", "Amazon IN",
        "Swiggy Instamart", "Cleartrip", "Apple IN", "Zomato",
    ])
    amount = round(rng.uniform(300, 48000), 2)
    status = rng.choice([
        "settled", "settled", "settled", "pending", "reversed", "disputed",
    ])
    days_ago = rng.randint(0, 38)
    ts = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
    return {
        "reference": ref,
        "status": status,
        "merchant": merchant,
        "amount_inr": amount,
        "card_last4": f"{rng.randint(1000, 9999):04d}",
        "rail": rng.choice(["UPI", "Visa", "Mastercard", "Rupay"]),
        "timestamp": ts,
        "refund_eligible": status in {"settled", "pending"} and days_ago <= 30,
    }


def initiate_refund(reference: str, reason: str, tool_context: ToolContext) -> dict:
    """Initiate a refund on a single transaction.

    Args:
        reference: The transaction reference to refund.
        reason: A short free-text reason — typically what the customer
            said. Stored verbatim on the case.

    Returns:
        A dict with the refund id, status, ETA, and a note. If the
        transaction is not eligible (too old, already refunded,
        disputed), returns status="declined" with the reason.
    """
    txn = lookup_transaction(reference)
    if txn["status"] == "unknown":
        return {"status": "declined", "note": txn["note"]}
    if not txn.get("refund_eligible"):
        return {
            "status": "declined",
            "reference": txn["reference"],
            "note": (
                "Transaction is not in a refundable state. "
                "Status: " + txn["status"] + ". Offer to file a dispute instead."
            ),
        }
    refund_id = f"RF-{uuid.uuid4().hex[:8].upper()}"
    eta_hr = 72 if txn["rail"] in {"Visa", "Mastercard"} else 24
    record = {
        "status": "initiated",
        "refund_id": refund_id,
        "reference": txn["reference"],
        "amount_inr": txn["amount_inr"],
        "reason": reason,
        "eta_hours": eta_hr,
        "rail": txn["rail"],
    }
    refunds = tool_context.state.get("refunds", [])
    refunds.append(record)
    tool_context.state["refunds"] = refunds
    return record


def file_dispute(
    reference: str,
    category: str,
    narrative: str,
    tool_context: ToolContext,
) -> dict:
    """File a chargeback dispute on a transaction.

    Args:
        reference: The transaction reference.
        category: One of "fraud", "product_not_received",
            "product_not_as_described", "duplicate_charge",
            "service_not_received", "other".
        narrative: The customer's account of what happened, in their
            own words. Two or three sentences is plenty.

    Returns:
        A dict with the case id, SLA, and a note on what happens next.
    """
    allowed = {
        "fraud",
        "product_not_received",
        "product_not_as_described",
        "duplicate_charge",
        "service_not_received",
        "other",
    }
    if category not in allowed:
        return {
            "status": "declined",
            "note": f"Category must be one of {sorted(allowed)}.",
        }
    txn = lookup_transaction(reference)
    if txn["status"] == "unknown":
        return {"status": "declined", "note": txn["note"]}
    case_id = f"DS-{uuid.uuid4().hex[:8].upper()}"
    sla_days = 7 if category == "fraud" else 14
    record = {
        "status": "open",
        "case_id": case_id,
        "reference": txn["reference"],
        "category": category,
        "narrative": narrative,
        "sla_days": sla_days,
    }
    cases = tool_context.state.get("disputes", [])
    cases.append(record)
    tool_context.state["disputes"] = cases
    return record


def block_card(
    card_last4: str,
    reason: str,
    tool_context: ToolContext,
) -> dict:
    """Place an immediate block on a card, for fraud or loss.

    Args:
        card_last4: Four-digit card tail, as read by the customer.
        reason: "lost", "stolen", "fraud_suspected", or a short phrase.

    Returns:
        A dict with the block id, effective-from timestamp, and a note
        about the replacement timeline. Blocks are irreversible on this
        line; the agent must have confirmed the customer's identity
        before calling.
    """
    if not card_last4 or len(card_last4) != 4 or not card_last4.isdigit():
        return {
            "status": "declined",
            "note": "Card tail must be exactly four digits — ask the customer to re-read.",
        }
    block_id = f"BLK-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "status": "blocked",
        "block_id": block_id,
        "card_last4": card_last4,
        "reason": reason,
        "effective_from": now,
        "replacement_eta_days": 3,
    }
    blocks = tool_context.state.get("blocks", [])
    blocks.append(record)
    tool_context.state["blocks"] = blocks
    return record


def case_summary(tool_context: ToolContext) -> dict:
    """Return a summary of refunds, disputes, and blocks raised this call."""
    return {
        "refunds": tool_context.state.get("refunds", []),
        "disputes": tool_context.state.get("disputes", []),
        "blocks": tool_context.state.get("blocks", []),
    }
