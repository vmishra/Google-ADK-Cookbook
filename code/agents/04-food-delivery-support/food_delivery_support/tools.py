"""Non-computer-use tools the food delivery agent can call when a
customer asks for something a UI click would be overkill for: fetching
the canonical status of an order, looking up a driver, issuing a refund.

These live alongside the ComputerUseToolset. The model chooses: if the
customer's request is covered by one of these structured tools, call
it; otherwise, drive the merchant dashboard in the browser.
"""
from __future__ import annotations

import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone

from google.adk.tools.tool_context import ToolContext


def _rng(k: str) -> random.Random:
    return random.Random(int(hashlib.sha256(k.encode()).hexdigest()[:12], 16))


def lookup_order(order_id: str) -> dict:
    """Return the current status of a delivery order.

    Args:
        order_id: The alphanumeric order code — e.g. "FD-71023".

    Returns:
        A dict with status, placed_at, merchant, items (list), subtotal,
        driver name + phone if dispatched, estimated arrival, and the
        current customer-facing note. Returns status="unknown" if
        nothing matches.
    """
    code = order_id.strip().upper()
    if len(code) < 4:
        return {"status": "unknown", "note": "Order id is too short."}
    rng = _rng(code)
    state = rng.choice([
        "placed", "accepted", "cooking", "ready", "picked_up",
        "in_transit", "delivered", "cancelled",
    ])
    placed_min_ago = rng.randint(2, 90)
    items = rng.sample(
        [
            {"name": "Butter chicken", "qty": 1, "price": 420},
            {"name": "Garlic naan", "qty": 2, "price": 60},
            {"name": "Dal makhani", "qty": 1, "price": 340},
            {"name": "Paneer tikka", "qty": 1, "price": 380},
            {"name": "Cold coffee", "qty": 1, "price": 180},
            {"name": "Chocolate brownie", "qty": 1, "price": 220},
        ],
        k=rng.randint(2, 4),
    )
    subtotal = sum(i["qty"] * i["price"] for i in items)
    driver = None
    if state in {"picked_up", "in_transit", "delivered"}:
        driver = {
            "name": rng.choice(["Arjun", "Ravi", "Priya", "Vikram", "Meera", "Sanjay"]),
            "phone": f"+91 9{rng.randint(100000000, 999999999)}",
            "vehicle": rng.choice(["bike", "scooter"]),
        }
    notes = {
        "placed": "Awaiting merchant acceptance.",
        "accepted": "Merchant confirmed — food will start soon.",
        "cooking": "Kitchen is preparing the order.",
        "ready": "Ready for pickup at the restaurant.",
        "picked_up": "Driver has picked up the order.",
        "in_transit": "On the way to the customer.",
        "delivered": "Order delivered.",
        "cancelled": "Cancelled. See refund policy.",
    }
    eta = (datetime.now(timezone.utc) + timedelta(minutes=rng.randint(5, 40))).isoformat()
    return {
        "order_id": code,
        "status": state,
        "placed_at": (datetime.now(timezone.utc) - timedelta(minutes=placed_min_ago)).isoformat(),
        "merchant": rng.choice(["Dilli 6 Kitchen", "Karim's Legacy", "Biryani Blues", "Southern Spice"]),
        "items": items,
        "subtotal_inr": subtotal,
        "driver": driver,
        "estimated_arrival": eta if state not in {"delivered", "cancelled"} else None,
        "note": notes[state],
    }


def issue_refund(
    order_id: str,
    amount_inr: float,
    reason: str,
    tool_context: ToolContext,
) -> dict:
    """Issue a refund against an order — partial or full.

    Args:
        order_id: The order code.
        amount_inr: Refund amount. Must be > 0 and ≤ the order subtotal.
        reason: Short free-text reason. Stored on the case.

    Returns:
        A dict with refund_id, status, amount, ETA. Fails with status=
        "declined" and a note for unknown orders or over-refunds.
    """
    order = lookup_order(order_id)
    if order["status"] == "unknown":
        return {"status": "declined", "note": order["note"]}
    if amount_inr <= 0 or amount_inr > order["subtotal_inr"]:
        return {
            "status": "declined",
            "note": (
                f"Amount must be between 1 and {order['subtotal_inr']} for this order."
            ),
        }
    refund = {
        "status": "initiated",
        "refund_id": f"RF-{uuid.uuid4().hex[:8].upper()}",
        "order_id": order["order_id"],
        "amount_inr": amount_inr,
        "reason": reason,
        "eta_minutes": 90,
    }
    rs = tool_context.state.get("refunds", [])
    rs.append(refund)
    tool_context.state["refunds"] = rs
    return refund


def dispatch_replacement_driver(order_id: str, tool_context: ToolContext) -> dict:
    """Assign a fresh driver to an order that has been unassigned too
    long or whose driver reported a breakdown.

    Args:
        order_id: The order code.

    Returns:
        A dict with status, driver name + phone, and new ETA. Refuses
        on delivered or cancelled orders.
    """
    order = lookup_order(order_id)
    if order["status"] in {"delivered", "cancelled"}:
        return {
            "status": "declined",
            "note": f"Order is {order['status']} — no driver to reassign.",
        }
    rng = _rng(order_id + "rep")
    driver = {
        "name": rng.choice(["Ayesha", "Kabir", "Neha", "Rohit"]),
        "phone": f"+91 9{rng.randint(100000000, 999999999)}",
        "vehicle": rng.choice(["bike", "scooter"]),
    }
    eta = (datetime.now(timezone.utc) + timedelta(minutes=18)).isoformat()
    record = {
        "status": "assigned",
        "order_id": order["order_id"],
        "driver": driver,
        "estimated_arrival": eta,
    }
    ds = tool_context.state.get("dispatches", [])
    ds.append(record)
    tool_context.state["dispatches"] = ds
    return record


def case_summary(tool_context: ToolContext) -> dict:
    """Return refunds and driver dispatches raised this session."""
    return {
        "refunds": tool_context.state.get("refunds", []),
        "dispatches": tool_context.state.get("dispatches", []),
    }
