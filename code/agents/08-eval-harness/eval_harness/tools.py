"""Harness tools. Two are exposed to the model:

  list_eval_suites()             returns available suites.
  run_eval_case(suite_id, case_id)  runs one case, returns the verdict.

The per-suite fan-out is done by the server (POST /run/{suite_id})
so each case streams out as it completes. The model can still call
run_eval_case directly if a user asks for a single case.
"""
from __future__ import annotations

from .runner import run_case
from .suites import SUITES, get_suite, list_suites


def list_eval_suites() -> dict:
    """List all eval suites with their target agent and case counts."""
    return {"suites": list_suites()}


async def run_eval_case(suite_id: str, case_id: str) -> dict:
    """Run a single case against its suite's target and return the verdict.

    Args:
        suite_id: The suite identifier, e.g. "concierge-smoke".
        case_id:  The case identifier within that suite.

    Returns:
        A verdict dict (see runner.run_case).
    """
    suite = get_suite(suite_id)
    if suite is None:
        return {"error": "suite_not_found", "suite_id": suite_id}
    case = next((c for c in suite["cases"] if c["id"] == case_id), None)
    if case is None:
        return {"error": "case_not_found", "suite_id": suite_id, "case_id": case_id}
    verdict = await run_case(
        target_url=suite["target_url"],
        prompt=case["prompt"],
        rubric=case["rubric"],
    )
    return {
        "suite_id": suite_id,
        "case_id": case_id,
        "prompt": case["prompt"],
        "verdict": verdict,
    }


__all__ = ["list_eval_suites", "run_eval_case", "SUITES"]
