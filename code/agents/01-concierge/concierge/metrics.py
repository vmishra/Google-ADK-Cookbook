"""Light-weight per-turn telemetry for the agent's FastAPI server.

We record one `TurnMetrics` per user message and keep the last N in a
ring buffer. The `/metrics` endpoint on the server returns the current
summary + raw turns as JSON, which the portal renders live.

What we track per turn:

- `ttft_ms`        — time from receiving the user message to the first
                     text or audio token the model emits.
- `total_ms`       — time from receive to turn_complete.
- `input_tokens`   — prompt tokens (max across the turn, since ADK
                     events report growing totals as sub-agents run).
- `output_tokens`  — candidate tokens (sum across the turn).
- `tool_calls`     — count of function calls the model made.
- `cost_inr`       — best-effort estimate from the token counts.
- `model`          — which model answered. Useful when an agent is a
                     pipeline with multiple tiers.

These are *estimates* — published public prices move. Treat them as a
ballpark for comparing design choices, not a billing statement.
"""
from __future__ import annotations

import statistics
import time
from collections import deque
from typing import Any, Deque


# USD per million tokens, (input, output). Rough as of April 2026.
# Update in one place if Google publishes new prices.
_PRICES: dict[str, tuple[float, float]] = {
    "gemini-3.1-pro-preview": (1.25, 5.00),
    "gemini-3-flash-preview": (0.075, 0.30),
    "gemini-3.1-flash-lite-preview": (0.02, 0.08),
    "gemini-3.1-flash-live-preview": (0.30, 2.50),
    "gemini-live-2.5-flash-native-audio": (0.30, 2.50),
    "gemini-2.5-flash-native-audio-preview-12-2025": (0.30, 2.50),
    "gemini-2.5-computer-use-preview-10-2025": (1.25, 5.00),
}
_USD_TO_INR = 84.0


def _price_of(model: str) -> tuple[float, float]:
    # Longest prefix match so `gemini-3-flash-preview-*` hits the right tier.
    best = ""
    for prefix in _PRICES:
        if model.startswith(prefix) and len(prefix) > len(best):
            best = prefix
    return _PRICES.get(best, (0.0, 0.0))


class TurnMetrics:
    __slots__ = (
        "model", "started_at", "first_token_at", "finished_at",
        "input_tokens", "output_tokens", "tool_calls", "error",
    )

    def __init__(self, model: str):
        self.model = model
        self.started_at: float = time.monotonic()
        self.first_token_at: float | None = None
        self.finished_at: float | None = None
        self.input_tokens: int = 0
        self.output_tokens: int = 0
        self.tool_calls: int = 0
        self.error: str | None = None

    def mark_first_token(self) -> None:
        if self.first_token_at is None:
            self.first_token_at = time.monotonic()

    def record_usage(self, usage: Any) -> None:
        """Pull token counts off an ADK event's `usage_metadata`.

        Field names differ slightly across ADK versions; we probe
        defensively. Prompt tokens are taken as max (they are reported
        cumulatively); candidate tokens are summed.
        """
        if usage is None:
            return
        prompt = (
            getattr(usage, "prompt_token_count", None)
            or getattr(usage, "prompt_tokens", None)
            or 0
        )
        candidate = (
            getattr(usage, "candidates_token_count", None)
            or getattr(usage, "candidate_tokens", None)
            or getattr(usage, "completion_tokens", None)
            or 0
        )
        self.input_tokens = max(self.input_tokens, int(prompt or 0))
        self.output_tokens += int(candidate or 0)

    def record_tool_call(self) -> None:
        self.tool_calls += 1

    def finish(self, error: str | None = None) -> None:
        self.finished_at = time.monotonic()
        self.error = error

    def as_dict(self) -> dict:
        def ms(a: float | None, b: float | None) -> float | None:
            if a is None or b is None:
                return None
            return round((b - a) * 1000, 1)

        in_price, out_price = _price_of(self.model)
        cost_usd = (
            (self.input_tokens / 1_000_000) * in_price
            + (self.output_tokens / 1_000_000) * out_price
        )
        return {
            "model": self.model,
            "ttft_ms": ms(self.started_at, self.first_token_at),
            "total_ms": ms(self.started_at, self.finished_at),
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "tool_calls": self.tool_calls,
            "cost_usd": round(cost_usd, 6),
            "cost_inr": round(cost_usd * _USD_TO_INR, 4),
            "error": self.error,
        }


class MetricsStore:
    """Ring-buffer of recent turns + aggregate summary."""

    def __init__(self, window: int = 50) -> None:
        self.turns: Deque[dict] = deque(maxlen=window)

    def record(self, turn: TurnMetrics) -> None:
        self.turns.append(turn.as_dict())

    def summary(self) -> dict:
        turns = list(self.turns)
        if not turns:
            return {"count": 0}
        ttft = [t["ttft_ms"] for t in turns if t.get("ttft_ms") is not None]
        total = [t["total_ms"] for t in turns if t.get("total_ms") is not None]

        def p(values: list[float], q: float) -> float | None:
            if not values:
                return None
            ordered = sorted(values)
            k = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * q))))
            return round(ordered[k], 1)

        return {
            "count": len(turns),
            "ttft_p50_ms": round(statistics.median(ttft), 1) if ttft else None,
            "ttft_p95_ms": p(ttft, 0.95),
            "latency_p50_ms": round(statistics.median(total), 1) if total else None,
            "latency_p95_ms": p(total, 0.95),
            "total_input_tokens": sum(t.get("input_tokens", 0) for t in turns),
            "total_output_tokens": sum(t.get("output_tokens", 0) for t in turns),
            "total_tool_calls": sum(t.get("tool_calls", 0) for t in turns),
            "total_cost_inr": round(sum(t.get("cost_inr") or 0 for t in turns), 4),
            "total_cost_usd": round(sum(t.get("cost_usd") or 0 for t in turns), 6),
        }

    def snapshot(self) -> dict:
        return {"summary": self.summary(), "turns": list(self.turns)}
