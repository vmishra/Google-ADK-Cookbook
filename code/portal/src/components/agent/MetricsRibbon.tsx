import { useEffect, useState } from "react";

/**
 * Session-level aggregate ribbon. Polls /metrics every 3.5 s and
 * renders the rolling p50/p95 plus totals for the last 50 turns.
 *
 * Per-turn telemetry lives inline under each model bubble via
 * <TurnTelemetry /> — by design, this ribbon never shows 'this turn'.
 */

interface Summary {
  count: number;
  ttft_p50_ms?: number | null;
  ttft_p95_ms?: number | null;
  latency_p50_ms?: number | null;
  latency_p95_ms?: number | null;
  tokens_per_second_p50?: number | null;
  total_input_tokens?: number;
  total_cached_tokens?: number;
  total_output_tokens?: number;
  total_thinking_tokens?: number;
  total_tokens?: number;
  cache_hit_ratio?: number;
  total_tool_calls?: number;
  total_model_calls?: number;
  total_cost_inr?: number;
  total_cost_usd?: number;
  error_count?: number;
}

interface Props {
  baseUrl: string;
}

export function MetricsRibbon({ baseUrl }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${baseUrl}/metrics`);
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setSummary(j.summary);
      } catch {
        /* offline */
      }
    };
    load();
    const interval = setInterval(load, 3500);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [baseUrl]);

  const count = summary?.count ?? 0;
  const scope = count > 0 ? `${count} turn${count === 1 ? "" : "s"}` : "session";

  const primary = [
    {
      label: "ttft · p50",
      value: fmtMs(summary?.ttft_p50_ms),
      hint: fmtMs(summary?.ttft_p95_ms, "p95"),
    },
    {
      label: "latency · p50",
      value: fmtMs(summary?.latency_p50_ms),
      hint: fmtMs(summary?.latency_p95_ms, "p95"),
    },
    {
      label: "tokens · in",
      value: fmtInt(summary?.total_input_tokens),
      hint: scope,
    },
    {
      label: "tokens · out",
      value: fmtInt(summary?.total_output_tokens),
      hint: scope,
    },
    {
      label: "tools",
      value: fmtInt(summary?.total_tool_calls),
      hint: scope,
    },
    {
      label: "cost",
      value: fmtInr(summary?.total_cost_inr),
      hint: scope,
    },
  ];

  const secondary = [
    { label: "tok/s · p50", value: fmtRate(summary?.tokens_per_second_p50) },
    { label: "cache", value: fmtRatio(summary?.cache_hit_ratio) },
    { label: "thinking", value: fmtInt(summary?.total_thinking_tokens) },
    { label: "model calls", value: fmtInt(summary?.total_model_calls) },
    { label: "total tok", value: fmtInt(summary?.total_tokens) },
    {
      label: "errors",
      value:
        summary?.error_count && summary.error_count > 0
          ? String(summary.error_count)
          : "0",
    },
  ];

  return (
    <div className="space-y-2" data-numeric>
      <div className="flex items-stretch divide-x divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--elev-1)] overflow-hidden">
        {primary.map((c) => (
          <div key={c.label} className="px-3 py-2 flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-muted)] font-medium">
                {c.label}
              </span>
              <span className="text-[10px] text-[var(--text-subtle)] font-[var(--font-mono)]">
                {c.hint}
              </span>
            </div>
            <div className="text-[20px] font-[var(--font-mono)] font-medium tabular-nums tracking-[-0.01em] mt-0.5 truncate text-[var(--text)]">
              {c.value}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-stretch divide-x divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
        {secondary.map((c) => (
          <div key={c.label} className="px-3 py-1.5 flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[9.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-muted)] font-medium">
                {c.label}
              </span>
              <span className="text-[13px] font-[var(--font-mono)] font-medium tabular-nums text-[var(--text)] truncate">
                {c.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- formatters ---------- */

function fmtMs(v: number | null | undefined, hint?: string): string {
  if (v == null) return "–";
  const s = v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`;
  return hint ? `${hint} ${s}` : s;
}

function fmtInt(v: number | null | undefined): string {
  if (v == null || v === 0) return "–";
  return v.toLocaleString("en-IN");
}

function fmtInr(v: number | null | undefined): string {
  if (v == null || v === 0) return "–";
  if (v < 1) return `₹ ${v.toFixed(4)}`;
  if (v < 1000) return `₹ ${v.toFixed(2)}`;
  return `₹ ${Math.round(v).toLocaleString("en-IN")}`;
}

function fmtRate(v: number | null | undefined): string {
  if (v == null || v === 0) return "–";
  return `${v.toFixed(1)}`;
}

function fmtRatio(v: number | null | undefined): string {
  if (v == null || v === 0) return "0%";
  return `${Math.round(v * 100)}%`;
}
