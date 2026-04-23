import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, Check, X, Loader2, ExternalLink } from "lucide-react";

import { streamSSE } from "@/lib/sse";
import { fadeRise } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Props {
  baseUrl: string;
  onActive?: (active: boolean) => void;
}

interface Suite {
  id: string;
  label: string;
  target_label: string;
  target_url: string;
  description: string;
  case_count: number;
}

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

interface CaseResult {
  case_id: string;
  prompt: string;
  state: "pending" | "running" | "passed" | "failed";
  passed?: boolean;
  checks?: Check[];
  transcript?: { final_text: string; tool_calls: string[]; total_ms: number | null };
  error?: string | null;
}

interface Summary {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  elapsed_ms: number;
}

export function EvalPanel({ baseUrl, onActive }: Props) {
  const [suites, setSuites] = useState<Suite[] | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [running, setRunning] = useState(false);
  const [detail, setDetail] = useState<CaseResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const h = await fetch(`${baseUrl}/health`);
        if (!alive) return;
        if (!h.ok) {
          setReachable(false);
          return;
        }
        const s = await fetch(`${baseUrl}/suites`);
        const body = await s.json();
        if (!alive) return;
        setSuites(body.suites as Suite[]);
        setReachable(true);
      } catch {
        if (alive) setReachable(false);
      }
    })();
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, [baseUrl]);

  const suite = useMemo(
    () => suites?.find((s) => s.id === selectedSuite) ?? null,
    [suites, selectedSuite],
  );

  const run = async (suiteId: string) => {
    if (running) return;
    setRunning(true);
    onActive?.(true);
    setSelectedSuite(suiteId);
    setSummary(null);
    setCases([]);
    setDetail(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await fetch(`${baseUrl}/run/${suiteId}`, {
        method: "POST",
        signal: ac.signal,
      });
      for await (const evt of streamSSE(r, ac.signal)) {
        if (evt.kind === "suite_started") {
          // nothing — we already set selectedSuite
        } else if (evt.kind === "case_started") {
          setCases((arr) => [
            ...arr,
            {
              case_id: evt.case_id,
              prompt: evt.prompt,
              state: "running",
            },
          ]);
        } else if (evt.kind === "case_result") {
          setCases((arr) => {
            const copy = [...arr];
            const idx = copy.findIndex((c) => c.case_id === evt.case_id);
            const hit: CaseResult = {
              case_id: evt.case_id,
              prompt: evt.prompt,
              state: evt.passed ? "passed" : "failed",
              passed: evt.passed,
              checks: evt.checks,
              transcript: evt.transcript,
              error: evt.error,
            };
            if (idx >= 0) copy[idx] = hit;
            else copy.push(hit);
            return copy;
          });
        } else if (evt.kind === "suite_summary") {
          setSummary({
            total: evt.total,
            passed: evt.passed,
            failed: evt.failed,
            pass_rate: evt.pass_rate,
            elapsed_ms: evt.elapsed_ms,
          });
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setCases((arr) => [
          ...arr,
          {
            case_id: "stream_error",
            prompt: "",
            state: "failed",
            passed: false,
            error: e.message,
          },
        ]);
      }
    } finally {
      setRunning(false);
      onActive?.(false);
    }
  };

  if (reachable === null) {
    return <EmptyState>checking the harness</EmptyState>;
  }
  if (reachable === false || !suites) {
    return (
      <EmptyState>
        <p className="text-[var(--text-muted)] max-w-[360px]">
          The eval harness isn't reachable at{" "}
          <span className="font-[var(--font-mono)]">{baseUrl}</span>. Start
          the server and reload.
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="flex h-full bg-[var(--surface)]">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[980px] mx-auto px-8 py-8">
          {/* Suite picker */}
          <div className="space-y-3 mb-8">
            <div className="kicker">suites</div>
            <div className="grid gap-3 md:grid-cols-2">
              {suites.map((s) => (
                <SuiteCard
                  key={s.id}
                  suite={s}
                  active={selectedSuite === s.id}
                  disabled={running}
                  onRun={() => run(s.id)}
                />
              ))}
            </div>
          </div>

          {/* Summary */}
          {(cases.length > 0 || running) && suite && (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="kicker">now running</div>
                <div className="font-[var(--font-serif)] text-[22px] leading-[1.2]">
                  {suite.label}
                </div>
                <div className="text-[12px] text-[var(--text-subtle)] font-[var(--font-mono)]">
                  → {suite.target_label} · {suite.target_url}
                </div>
              </div>
              {summary && (
                <div className="text-right">
                  <div className="kicker">result</div>
                  <div className="flex items-baseline gap-3">
                    <div
                      className="text-[26px] font-[var(--font-serif)]"
                      style={{
                        color:
                          summary.failed === 0
                            ? "var(--accent)"
                            : "var(--danger)",
                      }}
                    >
                      {summary.passed}/{summary.total}
                    </div>
                    <div className="text-[11px] text-[var(--text-subtle)] font-[var(--font-mono)]">
                      {(summary.pass_rate * 100).toFixed(0)}% · {Math.round(summary.elapsed_ms)}ms
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tiles */}
          {cases.length > 0 && (
            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              <AnimatePresence>
                {cases.map((c) => (
                  <CaseTile key={c.case_id} result={c} onClick={() => setDetail(c)} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {cases.length === 0 && !running && (
            <div className="text-[13px] text-[var(--text-subtle)] italic mt-6">
              Pick a suite above and hit run.
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && (
          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            className="w-[420px] shrink-0 border-l border-[var(--border)] overflow-auto p-6"
            style={{ background: "var(--elev-1)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="kicker">
                case ·{" "}
                <span
                  style={{
                    color:
                      detail.passed === true
                        ? "var(--accent)"
                        : detail.passed === false
                        ? "var(--danger)"
                        : "var(--text-muted)",
                  }}
                >
                  {detail.state}
                </span>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-[11px] tracking-[0.2em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)] hover:text-[var(--text)]"
              >
                close
              </button>
            </div>
            <div className="font-[var(--font-mono)] text-[12px] text-[var(--text-subtle)] mb-1">
              {detail.case_id}
            </div>
            <p className="text-[13px] leading-[1.55] text-[var(--text)] italic mb-5">
              “{detail.prompt}”
            </p>

            {detail.checks && detail.checks.length > 0 && (
              <div className="mb-5">
                <div className="kicker mb-2">checks</div>
                <ul className="space-y-1.5">
                  {detail.checks.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[12.5px] leading-[1.5]"
                    >
                      {c.passed ? (
                        <Check
                          size={13}
                          strokeWidth={2.2}
                          className="mt-[3px] shrink-0 text-[var(--accent)]"
                        />
                      ) : (
                        <X
                          size={13}
                          strokeWidth={2.2}
                          className="mt-[3px] shrink-0 text-[var(--danger)]"
                        />
                      )}
                      <div>
                        <div className="font-[var(--font-mono)] text-[11px] text-[var(--text-muted)]">
                          {c.name}
                        </div>
                        <div className="text-[12.5px] text-[var(--text)]">{c.detail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.transcript && (
              <div className="space-y-4">
                <div>
                  <div className="kicker mb-2">tool calls</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.transcript.tool_calls.length === 0 ? (
                      <span className="text-[11px] text-[var(--text-subtle)] italic">
                        none
                      </span>
                    ) : (
                      detail.transcript.tool_calls.map((t, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-[var(--font-mono)] px-1.5 py-[2px] rounded border border-[var(--border)]"
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">final text</div>
                  <p className="text-[12.5px] leading-[1.6] text-[var(--text-muted)] whitespace-pre-wrap">
                    {detail.transcript.final_text || (
                      <span className="italic text-[var(--text-subtle)]">empty</span>
                    )}
                  </p>
                </div>
                {detail.transcript.total_ms != null && (
                  <div className="text-[11px] text-[var(--text-subtle)] font-[var(--font-mono)]">
                    total {Math.round(detail.transcript.total_ms)}ms
                  </div>
                )}
              </div>
            )}

            {detail.error && (
              <div
                className="mt-4 px-3 py-2 rounded-[var(--radius-md)] border text-[12px] leading-[1.5]"
                style={{
                  background: "color-mix(in oklab, var(--danger) 8%, transparent)",
                  borderColor: "color-mix(in oklab, var(--danger) 40%, transparent)",
                }}
              >
                {detail.error}
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuiteCard({
  suite,
  active,
  disabled,
  onRun,
}: {
  suite: Suite;
  active: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <motion.div
      variants={fadeRise}
      initial="initial"
      animate="animate"
      className={cn(
        "rounded-[var(--radius-lg)] border p-4 flex flex-col gap-2",
        active
          ? "border-[var(--border-strong)] bg-[var(--elev-1)]"
          : "border-[var(--border)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="kicker">{suite.id}</div>
          <div className="font-[var(--font-serif)] text-[19px] leading-[1.2] mt-0.5">
            {suite.label}
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={disabled}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border transition-colors disabled:opacity-40"
          style={{
            background: "color-mix(in oklab, var(--accent) 14%, transparent)",
            borderColor: "color-mix(in oklab, var(--accent) 45%, transparent)",
            color: "var(--text)",
          }}
        >
          {disabled ? (
            <Loader2 size={12} strokeWidth={2} className="animate-spin" />
          ) : (
            <Play size={12} strokeWidth={2} />
          )}
          run
        </button>
      </div>
      <p className="text-[12.5px] leading-[1.55] text-[var(--text-muted)]">
        {suite.description}
      </p>
      <div className="flex items-center gap-3 text-[11px] text-[var(--text-subtle)] font-[var(--font-mono)]">
        <span>{suite.case_count} cases</span>
        <span>·</span>
        <span>→ {suite.target_label}</span>
        <a
          href={suite.target_url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto hover:text-[var(--text)] flex items-center gap-1"
        >
          <ExternalLink size={10} strokeWidth={2} /> {suite.target_url}
        </a>
      </div>
    </motion.div>
  );
}

function CaseTile({
  result,
  onClick,
}: {
  result: CaseResult;
  onClick: () => void;
}) {
  const state = result.state;
  const bg =
    state === "passed"
      ? "color-mix(in oklab, var(--accent) 10%, var(--elev-1))"
      : state === "failed"
      ? "color-mix(in oklab, var(--danger) 10%, var(--elev-1))"
      : "var(--elev-1)";
  const border =
    state === "passed"
      ? "color-mix(in oklab, var(--accent) 50%, transparent)"
      : state === "failed"
      ? "color-mix(in oklab, var(--danger) 50%, transparent)"
      : "var(--border)";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={fadeRise}
      initial="initial"
      animate="animate"
      className="text-left rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors hover:bg-[var(--elev-2)]"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-center gap-2">
        {state === "passed" ? (
          <Check size={13} strokeWidth={2.2} className="text-[var(--accent)]" />
        ) : state === "failed" ? (
          <X size={13} strokeWidth={2.2} className="text-[var(--danger)]" />
        ) : (
          <Loader2
            size={13}
            strokeWidth={2}
            className="animate-spin text-[var(--text-subtle)]"
          />
        )}
        <span className="font-[var(--font-mono)] text-[11.5px] text-[var(--text)]">
          {result.case_id}
        </span>
      </div>
      <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-[1.45] line-clamp-2">
        {result.prompt}
      </p>
      {result.transcript?.total_ms != null && (
        <div className="text-[10.5px] text-[var(--text-subtle)] font-[var(--font-mono)] mt-1.5">
          {Math.round(result.transcript.total_ms)}ms
          {result.transcript.tool_calls.length > 0 &&
            ` · ${result.transcript.tool_calls.length} tool${
              result.transcript.tool_calls.length === 1 ? "" : "s"
            }`}
        </div>
      )}
    </motion.button>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center px-6 py-12 text-center">
      <motion.div variants={fadeRise} initial="initial" animate="animate">
        <div className="text-[14px] text-[var(--text-muted)]">{children}</div>
      </motion.div>
    </div>
  );
}
