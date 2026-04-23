"""Run one eval case against a remote ADK agent.

Opens a fresh session on the target via POST /session, streams its
/chat SSE, and collects:

  - the ordered list of tool calls
  - the final text of the response
  - total_ms from the target's own `turn_complete` metrics

Then evaluates the rubric and returns the verdict dict.
"""
from __future__ import annotations

import json
import time
from typing import Any

import httpx


async def run_case(
    target_url: str, prompt: str, rubric: dict, timeout_s: float = 60.0
) -> dict:
    """Execute one case. Returns a verdict:

        {
          "passed": bool,
          "checks": [{"name": str, "passed": bool, "detail": str}, ...],
          "transcript": {
            "final_text": str,
            "tool_calls": [str, ...],
            "total_ms": float | None,
          },
          "error": str | None,
        }
    """
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            s = await client.post(f"{target_url}/session")
            s.raise_for_status()
            session_id = s.json()["session_id"]

            final_text_parts: list[str] = []
            tool_calls: list[str] = []
            total_ms: float | None = None

            async with client.stream(
                "POST",
                f"{target_url}/chat/{session_id}",
                headers={"content-type": "application/json"},
                json={"message": prompt},
            ) as r:
                r.raise_for_status()
                async for raw in r.aiter_lines():
                    if not raw or not raw.startswith("data:"):
                        continue
                    try:
                        evt = json.loads(raw[len("data:"):].strip())
                    except json.JSONDecodeError:
                        continue
                    kind = evt.get("kind")
                    if kind == "text":
                        final_text_parts.append(evt.get("data", ""))
                    elif kind == "tool_call":
                        tool_calls.append(evt.get("name", "?"))
                    elif kind == "turn_complete":
                        m = evt.get("metrics") or {}
                        total_ms = m.get("total_ms")
                    elif kind == "error":
                        return {
                            "passed": False,
                            "checks": [{
                                "name": "target_error",
                                "passed": False,
                                "detail": evt.get("data", "target returned error"),
                            }],
                            "transcript": {
                                "final_text": "".join(final_text_parts),
                                "tool_calls": tool_calls,
                                "total_ms": total_ms,
                            },
                            "error": evt.get("data"),
                        }
    except (httpx.HTTPError, httpx.ReadTimeout) as e:
        return {
            "passed": False,
            "checks": [{
                "name": "target_unreachable",
                "passed": False,
                "detail": str(e),
            }],
            "transcript": {
                "final_text": "",
                "tool_calls": [],
                "total_ms": None,
            },
            "error": f"target_unreachable: {e}",
        }

    elapsed_ms = (time.monotonic() - start) * 1000
    final_text = "".join(final_text_parts).strip()

    checks = _evaluate_rubric(rubric, final_text, tool_calls, total_ms or elapsed_ms)
    passed = all(c["passed"] for c in checks)

    return {
        "passed": passed,
        "checks": checks,
        "transcript": {
            "final_text": final_text,
            "tool_calls": tool_calls,
            "total_ms": round(total_ms if total_ms is not None else elapsed_ms, 1),
        },
        "error": None,
    }


def _evaluate_rubric(
    rubric: dict, final_text: str, tool_calls: list[str], total_ms: float
) -> list[dict[str, Any]]:
    """Run each rubric check. Returns per-check pass/fail + detail."""
    out: list[dict[str, Any]] = []
    lt = final_text.lower()

    if "contains_any" in rubric:
        needles = [s.lower() for s in rubric["contains_any"]]
        hit = next((n for n in needles if n in lt), None)
        out.append({
            "name": "contains_any",
            "passed": hit is not None,
            "detail": (
                f"matched '{hit}'" if hit
                else f"expected any of {rubric['contains_any']}"
            ),
        })

    if "contains_all" in rubric:
        missing = [s for s in rubric["contains_all"] if s.lower() not in lt]
        out.append({
            "name": "contains_all",
            "passed": not missing,
            "detail": "all present" if not missing else f"missing {missing}",
        })

    if "tools_called" in rubric:
        missing = [t for t in rubric["tools_called"] if t not in tool_calls]
        out.append({
            "name": "tools_called",
            "passed": not missing,
            "detail": (
                f"called {tool_calls}" if not missing
                else f"missing {missing}; saw {tool_calls}"
            ),
        })

    if "tools_forbidden" in rubric:
        hit = [t for t in rubric["tools_forbidden"] if t in tool_calls]
        out.append({
            "name": "tools_forbidden",
            "passed": not hit,
            "detail": "clean" if not hit else f"called forbidden {hit}",
        })

    if "max_total_ms" in rubric:
        ok = total_ms <= rubric["max_total_ms"]
        out.append({
            "name": "max_total_ms",
            "passed": ok,
            "detail": f"{total_ms:.0f}ms · cap {rubric['max_total_ms']}ms",
        })

    if not out:
        # empty rubric — always pass, but flag it.
        out.append({"name": "empty_rubric", "passed": True, "detail": "no checks defined"})

    return out
