"""Payout-desk tools for the HITL agent.

The flow the tools encode:

  draft_payout(vendor, amount, gl, memo)
      -> writes a draft into session state, returns a draft_id.

  request_approval(draft_id)      [LongRunningFunctionTool]
      -> stamps the draft as 'pending' and yields a pending handle.
         The server detects this tool call, emits a `pending_approval`
         SSE frame so the portal can show Approve / Deny buttons, and
         holds the turn closed. A human click posts the decision to
         /approve, which records it in state and auto-triggers the
         next user turn.

  check_approval(draft_id)
      -> called on the resumed turn. Reads the human decision off
         session state.

  post_payout(draft_id)
      -> finalises an approved payout. Refuses if not approved.

  list_pending, get_payout
      -> read-only helpers.

State layout under `tool_context.state`:

  payouts.drafts       : {draft_id: draft_dict}
  payouts.decisions    : {draft_id: {"decision": "approved"|"denied",
                                     "approver": str, "reason": str|None,
                                     "at": iso8601}}
  payouts.posted       : {draft_id: {"posted_at": iso8601, "txn_ref": str}}

Everything is mocked. No real money moves.
"""
from __future__ import annotations

import random
import string
from datetime import datetime, timezone

from google.adk.tools.tool_context import ToolContext


APPROVAL_THRESHOLD_INR = 50_000  # anything at/above this routes to a human


_VENDORS: dict[str, dict] = {
    "V-101": {
        "id": "V-101", "name": "Kavya Logistics Pvt Ltd",
        "pan": "AABCK1234F", "gst": "27AABCK1234F1Z5",
        "gl_default": "5040-LOG-COGS",
        "bank": {"account": "xxxxxx4821", "ifsc": "HDFC0001234"},
        "risk": "low",
    },
    "V-207": {
        "id": "V-207", "name": "North-Star Creative LLP",
        "pan": "AABCN7765Q", "gst": "29AABCN7765Q1Z0",
        "gl_default": "6100-MKT-OPEX",
        "bank": {"account": "xxxxxx9912", "ifsc": "ICIC0004567"},
        "risk": "medium",
    },
    "V-314": {
        "id": "V-314", "name": "Skyline Power Services",
        "pan": "AACCS9988R", "gst": "07AACCS9988R1ZE",
        "gl_default": "5030-UTIL-OPEX",
        "bank": {"account": "xxxxxx3310", "ifsc": "SBIN0000056"},
        "risk": "low",
    },
}


def _store(ctx: ToolContext) -> dict:
    root = ctx.state.get("payouts")
    if root is None:
        root = {"drafts": {}, "decisions": {}, "posted": {}}
        ctx.state["payouts"] = root
    return root


def _new_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{suffix}"


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def lookup_vendor(vendor_id: str) -> dict:
    """Return vendor master details: PAN, GST, bank, default GL code, risk tier.

    Args:
        vendor_id: The vendor code, e.g. "V-101".

    Returns:
        A dict with the vendor's registration and banking details, or
        {"error": "not_found"} if the id is unknown.
    """
    v = _VENDORS.get(vendor_id.upper())
    if v is None:
        return {"error": "not_found", "vendor_id": vendor_id}
    return dict(v)


def draft_payout(
    vendor_id: str,
    amount_inr: int,
    gl_code: str,
    memo: str,
    tool_context: ToolContext,
) -> dict:
    """Create a payout draft for a vendor.

    Drafts sit in session state until they are approved and posted. A
    draft above ₹50,000 requires human approval before it can be
    posted — call `request_approval` after drafting in that case.

    Args:
        vendor_id: The vendor code, e.g. "V-207".
        amount_inr: The gross amount in INR (integer rupees).
        gl_code: The general-ledger account code to book against,
            e.g. "6100-MKT-OPEX".
        memo: A short human-readable justification.

    Returns:
        {"draft_id": str, "needs_approval": bool, "draft": {...}}
    """
    vendor = _VENDORS.get(vendor_id.upper())
    if vendor is None:
        return {"error": "vendor_not_found", "vendor_id": vendor_id}
    store = _store(tool_context)
    draft_id = _new_id("PO")
    draft = {
        "draft_id": draft_id,
        "vendor": {"id": vendor["id"], "name": vendor["name"]},
        "amount_inr": int(amount_inr),
        "gl_code": gl_code,
        "memo": memo,
        "status": "drafted",
        "drafted_at": _now(),
    }
    store["drafts"][draft_id] = draft
    return {
        "draft_id": draft_id,
        "needs_approval": int(amount_inr) >= APPROVAL_THRESHOLD_INR,
        "threshold_inr": APPROVAL_THRESHOLD_INR,
        "draft": draft,
    }


def request_approval(
    draft_id: str,
    approver_team: str,
    tool_context: ToolContext,
) -> dict:
    """Route a drafted payout to a human approver and suspend.

    This is a long-running tool: it returns a `pending` handle. The
    server emits a `pending_approval` SSE frame so the portal can
    render Approve / Deny controls. The actual decision is captured
    on a subsequent turn by `check_approval`.

    Args:
        draft_id: The id returned by `draft_payout`.
        approver_team: The team that should review, e.g.
            "finance-controllers" or "vp-finance".

    Returns:
        {"status": "pending", "draft_id": str, "approver_team": str,
         "requested_at": iso8601}
    """
    store = _store(tool_context)
    draft = store["drafts"].get(draft_id)
    if draft is None:
        return {"error": "draft_not_found", "draft_id": draft_id}
    draft["status"] = "pending_approval"
    draft["approver_team"] = approver_team
    draft["requested_at"] = _now()
    return {
        "status": "pending",
        "draft_id": draft_id,
        "approver_team": approver_team,
        "amount_inr": draft["amount_inr"],
        "vendor": draft["vendor"],
        "requested_at": draft["requested_at"],
    }


def check_approval(draft_id: str, tool_context: ToolContext) -> dict:
    """Read the human decision for a pending draft.

    Returns {"decision": "approved"|"denied"|"pending", ...}.
    """
    store = _store(tool_context)
    draft = store["drafts"].get(draft_id)
    if draft is None:
        return {"error": "draft_not_found", "draft_id": draft_id}
    decision = store["decisions"].get(draft_id)
    if decision is None:
        return {"decision": "pending", "draft_id": draft_id}
    return {
        "decision": decision["decision"],
        "approver": decision.get("approver"),
        "reason": decision.get("reason"),
        "at": decision.get("at"),
        "draft_id": draft_id,
    }


def post_payout(draft_id: str, tool_context: ToolContext) -> dict:
    """Finalise an approved draft. Refuses unapproved or denied drafts.

    Args:
        draft_id: The id returned by `draft_payout`.

    Returns:
        {"posted": bool, "txn_ref": str, "posted_at": iso8601} or an
        error dict.
    """
    store = _store(tool_context)
    draft = store["drafts"].get(draft_id)
    if draft is None:
        return {"error": "draft_not_found", "draft_id": draft_id}
    if draft["amount_inr"] >= APPROVAL_THRESHOLD_INR:
        decision = store["decisions"].get(draft_id)
        if decision is None or decision["decision"] != "approved":
            return {
                "posted": False,
                "error": "not_approved",
                "reason": (
                    "Draft is above the ₹50,000 threshold and has no "
                    "recorded approval. Call request_approval first."
                ),
            }
    txn_ref = _new_id("TXN")
    record = {"posted_at": _now(), "txn_ref": txn_ref}
    store["posted"][draft_id] = record
    draft["status"] = "posted"
    draft["posted_at"] = record["posted_at"]
    draft["txn_ref"] = txn_ref
    return {"posted": True, "txn_ref": txn_ref, "posted_at": record["posted_at"]}


def list_pending(tool_context: ToolContext) -> dict:
    """Return drafts that are awaiting approval or ready to post."""
    store = _store(tool_context)
    out = []
    for draft_id, draft in store["drafts"].items():
        decision = store["decisions"].get(draft_id, {}).get("decision", "pending")
        posted = draft_id in store["posted"]
        out.append(
            {
                "draft_id": draft_id,
                "vendor": draft["vendor"]["name"],
                "amount_inr": draft["amount_inr"],
                "status": draft["status"],
                "decision": decision,
                "posted": posted,
            }
        )
    return {"items": out, "count": len(out)}


def get_payout(draft_id: str, tool_context: ToolContext) -> dict:
    """Return the full state for a single draft, including decision and post."""
    store = _store(tool_context)
    draft = store["drafts"].get(draft_id)
    if draft is None:
        return {"error": "draft_not_found", "draft_id": draft_id}
    return {
        "draft": draft,
        "decision": store["decisions"].get(draft_id),
        "posted": store["posted"].get(draft_id),
    }
