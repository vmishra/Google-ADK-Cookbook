import { useEffect, useState } from "react";

interface TurnMetrics {
  model: string;
  ttft_ms?: number | null;
  total_ms?: number | null;
  in_flight?: boolean;
  tokens_per_second?: number | null;
  input_tokens?: number;
  cached_tokens?: number;
  output_tokens?: number;
  thinking_tokens?: number;
  tool_use_prompt_tokens?: number;
  total_tokens?: number;
  cache_hit_ratio?: number;
  tool_calls?: number;
  model_calls?: number;
  partial_events?: number;
  interrupted?: boolean;
  finish_reason?: string | null;
  cost_inr?: number;
  cost_usd?: number;
  error?: string | null;
}

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
  lastTurn?: TurnMetrics | null;
}

export function MetricsRibbon({ baseUrl, lastTurn }: Props) {
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
  }, [baseUrl, lastTurn]);

  const scope = lastTurn
    ? (lastTurn.in_flight ? "live" : "last turn")
    : "p50 · last 50";
  const totalScope = lastTurn
    ? (lastTurn.in_flight ? "live" : "last turn")
    : "total";

  const primary = [
    {
      label: "ttft",
      value: fmtMs(lastTurn?.ttft_ms ?? summary?.ttft_p50_ms ?? null),
      hint: scope,
    },
    {
      label: "latency",
      value: fmtMs(lastTurn?.total_ms ?? summary?.latency_p50_ms ?? null),
      hint: scope,
    },
    {
      label: "tokens · in",
      value: fmtInt(lastTurn?.input_tokens ?? summary?.total_input_tokens),
      hint: totalScope,
    },
    {
      label: "tokens · out",
      value: fmtInt(lastTurn?.output_tokens ?? summary?.total_output_tokens),
      hint: totalScope,
    },
    {
      label: "tools",
      value: fmtInt(lastTurn?.tool_calls ?? summary?.total_tool_calls),
      hint: totalScope,
    },
    {
      label: "cost",
      value: fmtInr(lastTurn?.cost_inr ?? summary?.total_cost_inr),
      hint: totalScope,
    },
  ];

  const secondary = [
    {
      label: "tok/s",
      value: fmtRate(
        lastTurn?.tokens_per_second ?? summary?.tokens_per_second_p50 ?? null,
      ),
    },
    {
      label: "cache",
      value: fmtRatio(
        lastTurn?.cache_hit_ratio ?? summary?.cache_hit_ratio ?? null,
      ),
    },
    {
      label: "thinking",
      value: fmtInt(
        lastTurn?.thinking_tokens ?? summary?.total_thinking_tokens,
      ),
    },
    {
      label: "model calls",
      value: fmtInt(lastTurn?.model_calls ?? summary?.total_model_calls),
    },
    {
      label: "total tok",
      value: fmtInt(lastTurn?.total_tokens ?? summary?.total_tokens),
    },
    {
      label: "finish",
      value: fmtFinish(lastTurn?.finish_reason ?? null, summary?.error_count),
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

function fmtMs(v: number | null | undefined): string {
  if (v == null) return "–";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
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

function fmtFinish(last: string | null | undefined, errorCount?: number): string {
  if (last && last !== "STOP") return last.toLowerCase();
  if (errorCount && errorCount > 0) return `${errorCount} err`;
  if (last === "STOP") return "stop";
  return "–";
}
