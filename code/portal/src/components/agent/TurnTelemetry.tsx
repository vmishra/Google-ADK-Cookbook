/**
 * Per-turn telemetry drawer rendered under each model response.
 *
 * Collapsed (default): a single compact line of mono numerics —
 *   ttft · latency · in/out tokens · cost · finish · + details
 *
 * Expanded: a bordered panel showing every field in TurnMetrics plus
 * each tool call's arguments and return value as pretty JSON. Opens
 * with a fade + height expand, closes the same way. No shadows, no
 * colour accent beyond the hairline border — this is a reference
 * readout, not a feature.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Wrench } from "lucide-react";

import type { ToolExchange, TurnMetrics } from "./ChatPanel";
import { quickOut, spring } from "@/lib/motion";

interface Props {
  metrics: TurnMetrics | undefined;
  toolCalls: ToolExchange[];
  inFlight: boolean;
}

export function TurnTelemetry({ metrics, toolCalls, inFlight }: Props) {
  const [open, setOpen] = useState(false);

  if (!metrics && toolCalls.length === 0) return null;

  const m = metrics ?? {};
  const toolCount = toolCalls.length;

  const chips = [
    label("ttft", fmtMs(m.ttft_ms)),
    label("latency", fmtMs(m.total_ms)),
    label("in", fmtInt(m.input_tokens)),
    label("out", fmtInt(m.output_tokens)),
    label("cost", fmtInr(m.cost_inr)),
    toolCount > 0 ? label("tools", `${toolCount}`) : null,
    m.finish_reason && m.finish_reason !== "STOP"
      ? label("finish", m.finish_reason.toLowerCase())
      : null,
  ].filter(Boolean);

  return (
    <div
      className="mt-3 rounded-[var(--radius-md)] border"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-[var(--elev-1)] transition-colors rounded-[var(--radius-md)]"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-[var(--font-mono)] text-[var(--text-muted)] tabular-nums">
          {inFlight && (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: "var(--accent)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              live
            </span>
          )}
          {chips.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--text-faint)]">·</span>}
              {c}
            </span>
          ))}
        </div>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className="shrink-0 text-[var(--text-subtle)]"
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 200ms",
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: spring }}
            exit={{ height: 0, opacity: 0, transition: quickOut }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 py-4 border-t border-[var(--border)] space-y-5">
              <MetricsGrid metrics={m} />
              {toolCalls.length > 0 && <ToolCallList calls={toolCalls} />}
              {m.model && (
                <div className="text-[11px] font-[var(--font-mono)] text-[var(--text-subtle)] tracking-[0.04em]">
                  {m.model}
                  {m.model_calls && m.model_calls > 1 && (
                    <> · {m.model_calls} model calls</>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- metrics grid ---------- */

function MetricsGrid({ metrics }: { metrics: TurnMetrics }) {
  const rows: { group: string; cells: [string, string][] }[] = [
    {
      group: "latency",
      cells: [
        ["ttft", fmtMs(metrics.ttft_ms)],
        ["total", fmtMs(metrics.total_ms)],
        ["tok/s", metrics.tokens_per_second != null ? metrics.tokens_per_second.toFixed(1) : "–"],
      ],
    },
    {
      group: "tokens",
      cells: [
        ["input", fmtInt(metrics.input_tokens)],
        ["cached", fmtInt(metrics.cached_tokens)],
        ["output", fmtInt(metrics.output_tokens)],
        ["thinking", fmtInt(metrics.thinking_tokens)],
        ["tool prompt", fmtInt(metrics.tool_use_prompt_tokens)],
        ["total", fmtInt(metrics.total_tokens)],
        ["cache %", metrics.cache_hit_ratio != null ? `${Math.round(metrics.cache_hit_ratio * 100)}%` : "–"],
      ],
    },
    {
      group: "cost (est.)",
      cells: [
        ["inr", fmtInr(metrics.cost_inr)],
        ["usd", metrics.cost_usd ? `$ ${metrics.cost_usd.toFixed(6)}` : "–"],
      ],
    },
    {
      group: "orchestration",
      cells: [
        ["tool calls", fmtInt(metrics.tool_calls)],
        ["model calls", fmtInt(metrics.model_calls)],
        ["partials", fmtInt(metrics.partial_events)],
        ["finish", metrics.finish_reason ? metrics.finish_reason.toLowerCase() : "–"],
        ...(metrics.interrupted ? [["interrupted", "yes"] as [string, string]] : []),
      ],
    },
  ];

  const modalityRows: [string, string][] = [];
  const modalitySources: [string, Record<string, number> | undefined][] = [
    ["input", metrics.modalities?.input],
    ["output", metrics.modalities?.output],
    ["cached", metrics.modalities?.cached],
  ];
  for (const [role, src] of modalitySources) {
    if (!src) continue;
    for (const [modality, count] of Object.entries(src)) {
      if (count > 0) modalityRows.push([`${role} · ${modality.toLowerCase()}`, fmtInt(count)]);
    }
  }
  if (modalityRows.length > 0) {
    rows.push({ group: "modalities", cells: modalityRows });
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      {rows.map((row) => (
        <div key={row.group}>
          <div className="kicker mb-2">{row.group}</div>
          <dl className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: "auto 1fr" }}>
            {row.cells.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[11.5px] text-[var(--text-subtle)] font-[var(--font-mono)]">{k}</dt>
                <dd className="text-[12.5px] text-[var(--text)] font-[var(--font-mono)] tabular-nums text-right">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/* ---------- tool-call list ---------- */

function ToolCallList({ calls }: { calls: ToolExchange[] }) {
  return (
    <div>
      <div className="kicker mb-2">tool calls · {calls.length}</div>
      <div className="space-y-2">
        {calls.map((c, i) => (
          <ToolCallRow key={c.id} index={i + 1} call={c} />
        ))}
      </div>
    </div>
  );
}

function ToolCallRow({ index, call }: { index: number; call: ToolExchange }) {
  const [open, setOpen] = useState(false);
  const pending = call.result === undefined;
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--elev-1)] transition-colors rounded-[var(--radius-sm)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-[var(--font-mono)] text-[10px] text-[var(--text-subtle)] tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <Wrench size={12} strokeWidth={1.8} className="text-[var(--accent)] shrink-0" />
          <span className="font-[var(--font-mono)] text-[12.5px] text-[var(--text)] truncate">
            {call.name}
          </span>
          {pending && (
            <span className="text-[10px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
              pending
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          strokeWidth={1.8}
          className="shrink-0 text-[var(--text-subtle)]"
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 200ms",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: spring }}
            exit={{ height: 0, opacity: 0, transition: quickOut }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-[var(--border)]">
              <JsonBlock label="args" value={call.args} />
              {call.result !== undefined && (
                <JsonBlock label="result" value={call.result} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="kicker mb-1.5">{label}</div>
      <pre
        className="text-[11.5px] leading-[1.55] font-[var(--font-mono)] text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 overflow-auto whitespace-pre-wrap break-words max-h-[280px]"
      >
        {pretty(value)}
      </pre>
    </div>
  );
}

/* ---------- utils ---------- */

function label(k: string, v: string) {
  return (
    <>
      <span className="text-[var(--text-subtle)]">{k}</span>
      <span className="text-[var(--text)]">{v}</span>
    </>
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

function pretty(value: any): string {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
