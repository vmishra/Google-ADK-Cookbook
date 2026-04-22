import { useEffect, useState } from "react";

interface TurnMetrics {
  model: string;
  ttft_ms?: number | null;
  total_ms?: number | null;
  input_tokens?: number;
  output_tokens?: number;
  tool_calls?: number;
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
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_tool_calls?: number;
  total_cost_inr?: number;
  total_cost_usd?: number;
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

  const cells: { label: string; value: string; hint?: string }[] = [
    {
      label: "ttft",
      value: fmtMs(lastTurn?.ttft_ms ?? summary?.ttft_p50_ms ?? null),
      hint: lastTurn ? "this turn" : "p50 · last 50",
    },
    {
      label: "latency",
      value: fmtMs(lastTurn?.total_ms ?? summary?.latency_p50_ms ?? null),
      hint: lastTurn ? "this turn" : "p50 · last 50",
    },
    {
      label: "tokens in",
      value: fmtInt(lastTurn?.input_tokens ?? summary?.total_input_tokens),
      hint: lastTurn ? "this turn" : "total",
    },
    {
      label: "tokens out",
      value: fmtInt(lastTurn?.output_tokens ?? summary?.total_output_tokens),
      hint: lastTurn ? "this turn" : "total",
    },
    {
      label: "tool calls",
      value: fmtInt(lastTurn?.tool_calls ?? summary?.total_tool_calls),
      hint: lastTurn ? "this turn" : "total",
    },
    {
      label: "cost",
      value: fmtInr(lastTurn?.cost_inr ?? summary?.total_cost_inr),
      hint: lastTurn ? "this turn" : "total",
    },
  ];

  return (
    <div
      className="flex items-stretch divide-x divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--elev-1)] overflow-hidden"
      data-numeric
    >
      {cells.map((c) => (
        <div key={c.label} className="px-3 py-2 flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] tracking-[0.18em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
              {c.label}
            </span>
            {c.hint && (
              <span className="text-[10px] text-[var(--text-faint)] font-[var(--font-mono)]">
                {c.hint}
              </span>
            )}
          </div>
          <div className="text-[18px] font-[var(--font-mono)] font-medium tabular-nums tracking-[-0.01em] mt-0.5 truncate">
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

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
