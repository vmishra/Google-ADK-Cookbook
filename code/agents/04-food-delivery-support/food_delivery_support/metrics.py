"""Per-turn telemetry for the agent's FastAPI server.

We record one `TurnMetrics` per user message and keep the last N in a
ring buffer. `/metrics` returns `{summary, turns}` — the portal renders
this as the live ribbon at the top of each agent page and shows the
per-turn snapshot inline on `turn_complete`.

Per-turn fields captured:

  Latency decomposition
    ttft_ms               receive → first model token (text or audio)
    total_ms              receive → turn_complete
    tokens_per_second     output rate between first_token and finish

  Token accounting (from google.genai event.usage_metadata)
    input_tokens          prompt_token_count — max over the turn
    cached_tokens         cached_content_token_count — cached prompt
    output_tokens         candidates_token_count — sum over the turn
    thinking_tokens       thoughts_token_count — Gemini 3 reasoning
    total_tokens          input + output + thinking (for quick reads)
    cache_hit_ratio       cached / input, 0.0 when input is 0

  Tool + orchestration
    tool_calls            function calls the model emitted
    model_calls           distinct events carrying usage_metadata — for
                          sub-agent pipelines this reveals how many
                          model calls the turn actually cost

  Cost (estimate, INR + USD)
    Non-cached prompt input billed at the model's input price;
    cached prompt input billed at a 25% discount; output and
    thinking tokens both billed at the output price.

These are *estimates* — published public prices move. Treat as a
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

# Google bills cached prompt tokens at roughly 25% of the input rate.
_CACHE_DISCOUNT = 0.25


def _merge_modalities(target: dict[str, int], details: Any) -> None:
    """Accumulate ModalityTokenCount entries into a {modality: tokens} dict."""
    if not details:
        return
    try:
        for entry in details:
            modality = getattr(entry, "modality", None)
            count = getattr(entry, "token_count", None)
            if modality is None or count is None:
                continue
            name = getattr(modality, "name", str(modality))
            target[name] = target.get(name, 0) + int(count)
    except TypeError:
        # details wasn't iterable — ignore
        return


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
        "input_tokens", "cached_tokens", "output_tokens", "thinking_tokens",
        "tool_use_prompt_tokens",
        "modalities_in", "modalities_out", "modalities_cached",
        "tool_calls", "model_calls", "partial_events", "interrupted",
        "finish_reason", "error",
    )

    def __init__(self, model: str):
        self.model = model
        self.started_at: float = time.monotonic()
        self.first_token_at: float | None = None
        self.finished_at: float | None = None
        self.input_tokens: int = 0
        self.cached_tokens: int = 0
        self.output_tokens: int = 0
        self.thinking_tokens: int = 0
        self.tool_use_prompt_tokens: int = 0
        # Per-modality token breakdowns, keyed by "TEXT" / "AUDIO" / "IMAGE" / "VIDEO".
        self.modalities_in: dict[str, int] = {}
        self.modalities_out: dict[str, int] = {}
        self.modalities_cached: dict[str, int] = {}
        self.tool_calls: int = 0
        self.model_calls: int = 0
        self.partial_events: int = 0
        self.interrupted: bool = False
        self.finish_reason: str | None = None
        self.error: str | None = None

    def mark_first_token(self) -> None:
        if self.first_token_at is None:
            self.first_token_at = time.monotonic()

    def record_usage(self, event: Any) -> None:
        """Pull usage off a finalised ADK event.

        Important: we only record usage when the event is *not* partial.
        Gemini only attaches `usage_metadata` to the final event of a
        model call, but some SDK versions have been observed to re-emit
        cumulative snapshots on intermediate events — summing those
        would double-count. Each non-partial event with usage
        corresponds to exactly one LLM call; summing across them gives
        the true per-turn totals (critical for multi-agent / sub-agent
        pipelines where one turn triggers several LLM calls).

        `event` may be the full ADK event (preferred, so we can check
        `partial`) or a bare `usage_metadata` object (legacy callers) —
        both are tolerated.
        """
        if event is None:
            return
        # Accept either an event object or a raw usage_metadata (back-compat).
        if hasattr(event, "usage_metadata") or hasattr(event, "partial"):
            if getattr(event, "partial", False):
                return
            usage = getattr(event, "usage_metadata", None)
        else:
            usage = event
        if usage is None:
            return

        def pick(*names: str) -> int:
            for n in names:
                v = getattr(usage, n, None)
                if v is not None:
                    return int(v)
            return 0

        prompt = pick("prompt_token_count", "prompt_tokens")
        cached = pick("cached_content_token_count", "cached_tokens")
        candidate = pick(
            "candidates_token_count", "candidate_tokens", "completion_tokens"
        )
        thinking = pick(
            "thoughts_token_count", "thinking_token_count", "reasoning_token_count"
        )
        tool_use_prompt = pick(
            "tool_use_prompt_token_count", "tool_use_prompt_tokens"
        )

        # All counters sum. Because we only land here on non-partial
        # events, each call contributes one LLM call's worth of
        # tokens — no overlap, no double-count.
        self.input_tokens += prompt
        self.cached_tokens += cached
        self.output_tokens += candidate
        self.thinking_tokens += thinking
        self.tool_use_prompt_tokens += tool_use_prompt
        self.model_calls += 1

        # Per-modality breakdowns — list[ModalityTokenCount]
        _merge_modalities(
            self.modalities_in, getattr(usage, "prompt_tokens_details", None)
        )
        _merge_modalities(
            self.modalities_out, getattr(usage, "candidates_tokens_details", None)
        )
        _merge_modalities(
            self.modalities_cached, getattr(usage, "cache_tokens_details", None)
        )

    def record_event_signals(self, event: Any) -> None:
        """Harvest non-usage signals from an ADK event: partial flag,
        interrupted flag, finish_reason. Safe to call on every event."""
        if getattr(event, "partial", False):
            self.partial_events += 1
        if getattr(event, "interrupted", False):
            self.interrupted = True
        fr = getattr(event, "finish_reason", None)
        if fr:
            # Keep the most recent non-STOP reason, else last STOP.
            name = getattr(fr, "name", str(fr))
            if name and name != "STOP":
                self.finish_reason = name
            elif self.finish_reason is None:
                self.finish_reason = name

    def record_tool_call(self) -> None:
        self.tool_calls += 1

    def finish(self, error: str | None = None) -> None:
        self.finished_at = time.monotonic()
        self.error = error

    def as_dict(self) -> dict:
        # Live snapshot — if the turn is still running, clock against
        # now so total_ms and tokens_per_second tick up in real time.
        end = self.finished_at if self.finished_at is not None else time.monotonic()

        def ms(a: float | None, b: float | None) -> float | None:
            if a is None or b is None:
                return None
            return round((b - a) * 1000, 1)

        in_price, out_price = _price_of(self.model)
        billable_prompt = max(0, self.input_tokens - self.cached_tokens)
        cost_usd = (
            (billable_prompt / 1_000_000) * in_price
            + (self.cached_tokens / 1_000_000) * in_price * _CACHE_DISCOUNT
            + (self.output_tokens / 1_000_000) * out_price
            + (self.thinking_tokens / 1_000_000) * out_price
        )

        # tokens/sec. Prefer the streaming window (first_token → end)
        # when it's meaningfully wide. Non-streaming agents deliver
        # text and usage_metadata on the same event, which collapses
        # the window to microseconds and produces nonsense rates — so
        # fall back to the full turn duration below that threshold.
        tps: float | None = None
        if self.output_tokens > 0:
            window: float | None = None
            if self.first_token_at is not None:
                streamed = end - self.first_token_at
                if streamed > 0.05:
                    window = streamed
            if window is None:
                total = end - self.started_at
                if total > 0.05:
                    window = total
            if window:
                tps = round(self.output_tokens / window, 1)

        cache_ratio = (
            round(self.cached_tokens / self.input_tokens, 3)
            if self.input_tokens else 0.0
        )

        return {
            "model": self.model,
            # latency — total_ms ticks up live while the turn is in flight.
            "ttft_ms": ms(self.started_at, self.first_token_at),
            "total_ms": ms(self.started_at, end),
            "in_flight": self.finished_at is None,
            "tokens_per_second": tps,
            # tokens
            "input_tokens": self.input_tokens,
            "cached_tokens": self.cached_tokens,
            "output_tokens": self.output_tokens,
            "thinking_tokens": self.thinking_tokens,
            "tool_use_prompt_tokens": self.tool_use_prompt_tokens,
            "total_tokens": (
                self.input_tokens + self.output_tokens + self.thinking_tokens
            ),
            "cache_hit_ratio": cache_ratio,
            # per-modality breakdowns (present when the response carried them)
            "modalities": {
                "input": dict(self.modalities_in),
                "output": dict(self.modalities_out),
                "cached": dict(self.modalities_cached),
            },
            # orchestration + streaming signals
            "tool_calls": self.tool_calls,
            "model_calls": self.model_calls,
            "partial_events": self.partial_events,
            "interrupted": self.interrupted,
            "finish_reason": self.finish_reason,
            # cost (estimate)
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

    def reset(self) -> None:
        self.turns.clear()

    def summary(self) -> dict:
        turns = list(self.turns)
        if not turns:
            return {"count": 0}

        def vals(key: str) -> list[float]:
            return [t[key] for t in turns if t.get(key) is not None]

        def p(values: list[float], q: float) -> float | None:
            if not values:
                return None
            ordered = sorted(values)
            k = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * q))))
            return round(ordered[k], 1)

        ttft = vals("ttft_ms")
        total = vals("total_ms")
        tps = vals("tokens_per_second")

        total_in = sum(t.get("input_tokens", 0) for t in turns)
        total_cached = sum(t.get("cached_tokens", 0) for t in turns)

        return {
            "count": len(turns),
            # latency
            "ttft_p50_ms": round(statistics.median(ttft), 1) if ttft else None,
            "ttft_p95_ms": p(ttft, 0.95),
            "latency_p50_ms": round(statistics.median(total), 1) if total else None,
            "latency_p95_ms": p(total, 0.95),
            "tokens_per_second_p50": (
                round(statistics.median(tps), 1) if tps else None
            ),
            # tokens
            "total_input_tokens": total_in,
            "total_cached_tokens": total_cached,
            "total_output_tokens": sum(t.get("output_tokens", 0) for t in turns),
            "total_thinking_tokens": sum(t.get("thinking_tokens", 0) for t in turns),
            "total_tokens": sum(t.get("total_tokens", 0) for t in turns),
            "cache_hit_ratio": (
                round(total_cached / total_in, 3) if total_in else 0.0
            ),
            # orchestration
            "total_tool_calls": sum(t.get("tool_calls", 0) for t in turns),
            "total_model_calls": sum(t.get("model_calls", 0) for t in turns),
            # cost
            "total_cost_inr": round(sum(t.get("cost_inr") or 0 for t in turns), 4),
            "total_cost_usd": round(sum(t.get("cost_usd") or 0 for t in turns), 6),
            # errors
            "error_count": sum(1 for t in turns if t.get("error")),
        }

    def snapshot(self) -> dict:
        return {"summary": self.summary(), "turns": list(self.turns)}
