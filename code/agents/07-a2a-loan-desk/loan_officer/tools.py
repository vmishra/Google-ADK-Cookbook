"""Loan-officer tools.

The `request_credit_report` tool is the one that crosses a process
boundary: it HTTP-posts to the credit_bureau peer running on its own
FastAPI server. The bureau is addressed via BUREAU_URL (default
http://127.0.0.1:8017) — change it and the desk talks to a bureau in
production.

Everything else is local session-state bookkeeping so the decision
line is auditable from the UI.
"""
from __future__ import annotations

import os
import random
import string
from datetime import datetime, timezone

import httpx
from google.adk.tools.tool_context import ToolContext


BUREAU_URL = os.environ.get("BUREAU_URL", "http://127.0.0.1:8017")


_APPLICANTS: dict[str, dict] = {
    "APP-501": {
        "id": "APP-501",
        "name": "Farah Khan",
        "pan": "CXKPK7821J",
        "business": "Khan & Co. Handloom",
        "requested_inr": 450_000,
        "tenure_months": 24,
        "monthly_revenue_inr": 320_000,
        "existing_obligations_inr": 18_000,
        "purpose": "Working capital — Diwali season inventory.",
    },
    "APP-612": {
        "id": "APP-612",
        "name": "Ravi Chandrasekhar",
        "pan": "AABPR9984L",
        "business": "Nilgiri Roasters LLP",
        "requested_inr": 1_200_000,
        "tenure_months": 36,
        "monthly_revenue_inr": 850_000,
        "existing_obligations_inr": 62_000,
        "purpose": "Equipment — cold chain expansion for the Chennai plant.",
    },
    "APP-704": {
        "id": "APP-704",
        "name": "Meera Thomas",
        "pan": "AADPT4455F",
        "business": "Coir Forward Pvt Ltd",
        "requested_inr": 750_000,
        "tenure_months": 30,
        "monthly_revenue_inr": 480_000,
        "existing_obligations_inr": 41_000,
        "purpose": "Export packaging line for the EU corridor.",
    },
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _new_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{suffix}"


def _store(ctx: ToolContext) -> dict:
    root = ctx.state.get("loans")
    if root is None:
        root = {"bureau_reports": {}, "decisions": {}}
        ctx.state["loans"] = root
    return root


def lookup_applicant(applicant_id: str) -> dict:
    """Return an SME applicant's file: PAN, business, requested ticket,
    tenure, monthly revenue, existing obligations, purpose.

    Args:
        applicant_id: The file id, e.g. "APP-612".
    """
    a = _APPLICANTS.get(applicant_id.upper())
    if a is None:
        return {"error": "applicant_not_found", "applicant_id": applicant_id}
    return dict(a)


def request_credit_report(
    applicant_id: str,
    requested_amount_inr: int,
    existing_obligations_inr: int,
    tool_context: ToolContext,
) -> dict:
    """Ask the credit bureau peer for a report on this applicant.

    Posts to the bureau's `/score` endpoint over HTTP. This call
    crosses a real process boundary — the bureau is a separate
    FastAPI server with its own agent, metrics, and telemetry.

    Args:
        applicant_id: The file id; used to look up the PAN.
        requested_amount_inr: The loan size the desk is considering.
        existing_obligations_inr: Monthly EMI the applicant already
            services.

    Returns:
        The bureau's report dict (see credit_bureau.tools.score_credit).
    """
    applicant = _APPLICANTS.get(applicant_id.upper())
    if applicant is None:
        return {"error": "applicant_not_found", "applicant_id": applicant_id}
    pan = applicant["pan"]
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                f"{BUREAU_URL}/score",
                json={
                    "pan": pan,
                    "requested_amount_inr": int(requested_amount_inr),
                    "existing_obligations_inr": int(existing_obligations_inr),
                },
            )
            r.raise_for_status()
            report = r.json()
    except httpx.HTTPError as e:
        return {
            "error": "bureau_unreachable",
            "detail": str(e),
            "bureau_url": BUREAU_URL,
            "hint": "Start the bureau server: python server_bureau.py",
        }
    store = _store(tool_context)
    store["bureau_reports"][applicant_id.upper()] = report
    return report


def calculate_emi(
    principal_inr: int, tenure_months: int, annual_rate_pct: float
) -> dict:
    """Standard reducing-balance EMI calculation.

    Args:
        principal_inr: The loan principal in INR.
        tenure_months: Tenure in months.
        annual_rate_pct: Annual interest rate, e.g. 13.5.

    Returns:
        {"emi_inr": int, "total_interest_inr": int, "total_payable_inr": int}
    """
    if principal_inr <= 0 or tenure_months <= 0:
        return {"error": "invalid_inputs"}
    r = (annual_rate_pct / 100) / 12
    n = tenure_months
    if r == 0:
        emi = principal_inr / n
    else:
        emi = principal_inr * r * (1 + r) ** n / ((1 + r) ** n - 1)
    total = emi * n
    return {
        "emi_inr": int(round(emi)),
        "total_payable_inr": int(round(total)),
        "total_interest_inr": int(round(total - principal_inr)),
        "annual_rate_pct": annual_rate_pct,
        "tenure_months": tenure_months,
    }


def record_decision(
    applicant_id: str,
    decision: str,
    offered_amount_inr: int,
    offered_rate_pct: float,
    rationale: str,
    tool_context: ToolContext,
) -> dict:
    """Write the desk's final decision into session state.

    Args:
        applicant_id: The file id.
        decision: "approve" | "reject" | "refer_to_committee".
        offered_amount_inr: Ticket size the desk is willing to extend.
            0 for rejections.
        offered_rate_pct: Annual rate attached to the offer.
            0.0 for rejections.
        rationale: One sentence on why — references bureau flags or
            revenue coverage.

    Returns:
        The stored decision record.
    """
    store = _store(tool_context)
    record = {
        "decision_id": _new_id("DEC"),
        "applicant_id": applicant_id.upper(),
        "decision": decision,
        "offered_amount_inr": int(offered_amount_inr),
        "offered_rate_pct": float(offered_rate_pct),
        "rationale": rationale,
        "decided_at": _now(),
    }
    store["decisions"][applicant_id.upper()] = record
    return record
