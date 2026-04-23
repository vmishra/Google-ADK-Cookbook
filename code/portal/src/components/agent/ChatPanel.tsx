import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, Wrench, CircleDot, FileText, Check, X } from "lucide-react";

import { streamSSE } from "@/lib/sse";
import { chipEnter, fadeRise, spring } from "@/lib/motion";
import { Chip } from "@/components/primitives/Chip";
import { TurnTelemetry } from "./TurnTelemetry";
import { ModelResponse } from "./ModelResponse";

interface Props {
  baseUrl: string;
  prompts: string[];
  onTurn?: (metrics: any) => void;
  onActive?: (active: boolean) => void;
  onAuthor?: (author: string | null) => void;
  showAuthor?: boolean;
}

export interface ToolExchange {
  name: string;
  args: any;
  result?: any;
  id: string;
}

export interface TurnMetrics {
  model?: string;
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
  modalities?: {
    input?: Record<string, number>;
    output?: Record<string, number>;
    cached?: Record<string, number>;
  };
  tool_calls?: number;
  model_calls?: number;
  partial_events?: number;
  interrupted?: boolean;
  finish_reason?: string | null;
  cost_usd?: number;
  cost_inr?: number;
  error?: string | null;
}

export interface PendingApproval {
  draft_id: string;
  approver_team?: string;
  amount_inr?: number;
  vendor?: { id?: string; name?: string } | null;
  requested_at?: string;
  decision?: "approved" | "denied"; // set once acted on
  id: string;
}

export interface ArtifactCard {
  filename: string;
  version: number;
  mime_type: string;
  size_bytes: number;
  download_url: string; // relative to baseUrl
  id: string;
}

type Turn =
  | { kind: "user"; text: string }
  | {
      kind: "model";
      text: string;
      toolCalls: ToolExchange[];
      pendingApprovals: PendingApproval[];
      artifacts: ArtifactCard[];
      author?: string;
      complete: boolean;
      metrics?: TurnMetrics;
    }
  | { kind: "error"; text: string };

export function ChatPanel({ baseUrl, prompts, onActive, onAuthor, showAuthor }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // bootstrap
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const h = await fetch(`${baseUrl}/health`);
        if (!alive) return;
        if (!h.ok) { setReachable(false); return; }
        const s = await fetch(`${baseUrl}/session`, { method: "POST" });
        const body = await s.json();
        if (!alive) return;
        setSessionId(body.session_id);
        setReachable(true);
      } catch {
        if (alive) setReachable(false);
      }
    })();
    return () => { alive = false; abortRef.current?.abort(); };
  }, [baseUrl]);

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  const send = async (text: string) => {
    if (!text.trim() || busy || !sessionId) return;
    setBusy(true);
    onActive?.(true);
    setInput("");
    setTurns((t) => [
      ...t,
      { kind: "user", text },
      {
        kind: "model",
        text: "",
        toolCalls: [],
        pendingApprovals: [],
        artifacts: [],
        complete: false,
      },
    ]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await fetch(`${baseUrl}/chat/${sessionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: ac.signal,
      });
      for await (const evt of streamSSE(r, ac.signal)) {
        // Publish the speaking author on every event that carries one
        // — the architecture pane uses this to pulse the active node.
        if (typeof evt.author === "string" && evt.author) {
          onAuthor?.(evt.author);
        }
        if (evt.kind === "text") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = {
                ...last,
                text: last.text + evt.data,
                author: evt.author ?? last.author,
              };
            }
            return copy;
          });
        } else if (evt.kind === "tool_call") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = {
                ...last,
                toolCalls: [
                  ...last.toolCalls,
                  { name: evt.name, args: evt.args, id: crypto.randomUUID() },
                ],
                author: evt.author ?? last.author,
              };
            }
            return copy;
          });
        } else if (evt.kind === "tool_result") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              // Fill the result into the most-recent unresolved call of
              // the same name — ADK fires call → result in order.
              const calls = [...last.toolCalls];
              for (let i = calls.length - 1; i >= 0; i--) {
                if (calls[i]!.name === evt.name && calls[i]!.result === undefined) {
                  calls[i] = { ...calls[i]!, result: evt.data };
                  break;
                }
              }
              copy[copy.length - 1] = { ...last, toolCalls: calls };
            }
            return copy;
          });
        } else if (evt.kind === "author") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = { ...last, author: evt.author };
            }
            return copy;
          });
        } else if (evt.kind === "metrics_tick") {
          if (evt.metrics) {
            setTurns((arr) => {
              const copy = [...arr];
              const last = copy[copy.length - 1];
              if (last?.kind === "model") {
                copy[copy.length - 1] = { ...last, metrics: evt.metrics };
              }
              return copy;
            });
          }
        } else if (evt.kind === "turn_complete") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = {
                ...last,
                complete: true,
                metrics: evt.metrics ?? last.metrics,
              };
            }
            return copy;
          });
        } else if (evt.kind === "pending_approval") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = {
                ...last,
                pendingApprovals: [
                  ...last.pendingApprovals,
                  {
                    draft_id: evt.draft_id,
                    approver_team: evt.approver_team,
                    amount_inr: evt.amount_inr,
                    vendor: evt.vendor,
                    requested_at: evt.requested_at,
                    id: crypto.randomUUID(),
                  },
                ],
              };
            }
            return copy;
          });
        } else if (evt.kind === "artifact_ready") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = {
                ...last,
                artifacts: [
                  ...last.artifacts,
                  {
                    filename: evt.filename,
                    version: evt.version,
                    mime_type: evt.mime_type,
                    size_bytes: evt.size_bytes,
                    download_url: evt.download_url,
                    id: crypto.randomUUID(),
                  },
                ],
              };
            }
            return copy;
          });
        } else if (evt.kind === "error") {
          setTurns((arr) => [
            ...arr,
            { kind: "error", text: formatAgentError(evt.data) },
          ]);
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setTurns((arr) => [
          ...arr,
          { kind: "error", text: `Stream dropped — ${e.message}` },
        ]);
      }
    } finally {
      setBusy(false);
      onActive?.(false);
      onAuthor?.(null);
    }
  };

  const decide = async (approval: PendingApproval, decision: "approved" | "denied") => {
    if (!sessionId) return;
    try {
      await fetch(`${baseUrl}/approve/${sessionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draft_id: approval.draft_id,
          decision,
          approver: "operator",
        }),
      });
      // Mark the card as acted on so the user sees the outcome.
      setTurns((arr) =>
        arr.map((t) =>
          t.kind === "model"
            ? {
                ...t,
                pendingApprovals: t.pendingApprovals.map((p) =>
                  p.id === approval.id ? { ...p, decision } : p,
                ),
              }
            : t,
        ),
      );
      // Inject a follow-up user turn so the agent resumes and reads
      // the decision via check_approval.
      const note = decision === "approved" ? "approved" : "denied";
      send(`Approval recorded for ${approval.draft_id}: ${note}. Please continue.`);
    } catch (e) {
      // swallow — UI stays on the card
    }
  };

  if (reachable === null) {
    return <EmptyState>checking the agent</EmptyState>;
  }
  if (reachable === false) {
    return (
      <EmptyState>
        <p className="text-[var(--text-muted)] max-w-[360px]">
          The agent is not reachable at {" "}
          <span className="font-[var(--font-mono)]">{baseUrl}</span>. Start it
          with{" "}
          <span className="font-[var(--font-mono)]">uvicorn server:app</span>{" "}
          in its folder, or run{" "}
          <span className="font-[var(--font-mono)]">./scripts/workshop-up.sh</span>.
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      {/* Scroll area, max-width for editorial line length */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        aria-live="polite"
      >
        <div className="max-w-[780px] mx-auto px-8 py-10 space-y-6">
          {turns.length === 0 && (
            <div className="min-h-[320px] flex flex-col items-center justify-center gap-6">
              <motion.p
                variants={fadeRise}
                initial="initial"
                animate="animate"
                className="font-[var(--font-serif)] italic text-[var(--text-muted)] text-[26px] leading-[1.3] text-center max-w-[420px]"
              >
                What shall we arrange?
              </motion.p>
              {prompts.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-[520px]">
                  {prompts.slice(0, 3).map((p) => (
                    <motion.button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      variants={chipEnter}
                      initial="initial"
                      animate="animate"
                      className="text-left text-[13px] leading-[1.55] text-[var(--text-muted)] px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--elev-1)] hover:text-[var(--text)] transition-colors max-w-[260px]"
                    >
                      {truncate(p, 72)}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
          <AnimatePresence initial={false}>
            {turns.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeRise}
                initial="initial"
                animate="animate"
                layout={false}
              >
                {t.kind === "user" ? (
                  <UserBubble text={t.text} />
                ) : t.kind === "error" ? (
                  <ErrorBubble text={t.text} />
                ) : (
                  <ModelBubble
                    turn={t}
                    showAuthor={showAuthor}
                    baseUrl={baseUrl}
                    onDecide={decide}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Composer — its own card, inset from the edges, clearly visible. */}
      <div className="shrink-0 px-6 pb-5 pt-2">
        <div className="max-w-[780px] mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="relative flex items-end gap-2 rounded-[var(--radius-xl)] border bg-[var(--elev-1)] pl-4 pr-2 py-2.5 focus-within:border-[var(--accent)] transition-colors"
            style={{
              borderColor: "var(--border-strong)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder=""
              aria-label="Message"
              className="flex-1 resize-none bg-transparent border-0 outline-none text-[14.5px] text-[var(--text)] font-[var(--font-sans)] leading-[1.55] min-h-[36px] max-h-[220px] py-1.5"
              style={{ height: "auto" }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="h-9 w-9 rounded-full bg-[var(--accent)] text-[oklch(16%_0_0)] flex items-center justify-center shrink-0 disabled:opacity-30 hover:brightness-[1.04] active:brightness-[0.98] transition-[filter,opacity] duration-150"
            >
              <Send size={15} strokeWidth={1.9} />
            </button>
          </form>
          <div className="text-center text-[10.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)] mt-2.5">
            enter to send · shift + enter for a new line
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center px-6 py-12 text-center">
      <motion.div variants={fadeRise} initial="initial" animate="animate">
        <CircleDot size={24} strokeWidth={1.5} className="text-[var(--text-subtle)] mx-auto mb-3" />
        <div className="text-[14px] text-[var(--text-muted)]">{children}</div>
      </motion.div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] rounded-[var(--radius-lg)] bg-[var(--elev-2)] border border-[var(--border)] px-4 py-2.5">
        <p className="text-[14px] leading-[1.55] whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function ModelBubble({
  turn,
  showAuthor,
  baseUrl,
  onDecide,
}: {
  turn: Extract<Turn, { kind: "model" }>;
  showAuthor?: boolean;
  baseUrl: string;
  onDecide: (a: PendingApproval, d: "approved" | "denied") => void;
}) {
  return (
    <div className="flex flex-col gap-2 max-w-[680px]">
      {showAuthor && turn.author && (
        <span className="kicker">{turn.author.replace(/_/g, " ")}</span>
      )}
      <AnimatePresence>
        {turn.toolCalls.map((tc, i) => (
          <motion.div key={i} variants={chipEnter} initial="initial" animate="animate">
            <Chip tone="accent">
              <Wrench size={11} strokeWidth={1.8} />
              <span className="font-[var(--font-mono)]">{tc.name}</span>
            </Chip>
          </motion.div>
        ))}
      </AnimatePresence>
      {turn.text && (
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1, transition: spring }}
        >
          <ModelResponse text={turn.text} streaming={!turn.complete} />
        </motion.div>
      )}
      {!turn.text && turn.toolCalls.length === 0 && !turn.complete && (
        <div className="text-[13px] text-[var(--text-subtle)] italic">considering…</div>
      )}
      {turn.pendingApprovals.map((a) => (
        <ApprovalCard key={a.id} approval={a} onDecide={onDecide} />
      ))}
      {turn.artifacts.map((a) => (
        <ArtifactChip key={a.id} artifact={a} baseUrl={baseUrl} />
      ))}
      {(turn.metrics || turn.toolCalls.length > 0) && (
        <TurnTelemetry
          metrics={turn.metrics}
          toolCalls={turn.toolCalls}
          inFlight={!turn.complete}
        />
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  onDecide,
}: {
  approval: PendingApproval;
  onDecide: (a: PendingApproval, d: "approved" | "denied") => void;
}) {
  const decided = approval.decision;
  return (
    <motion.div
      variants={fadeRise}
      initial="initial"
      animate="animate"
      className="rounded-[var(--radius-lg)] border px-4 py-3"
      style={{
        background: decided
          ? "color-mix(in oklab, var(--elev-1) 100%, transparent)"
          : "color-mix(in oklab, var(--accent) 6%, var(--elev-1))",
        borderColor: decided
          ? "var(--border)"
          : "color-mix(in oklab, var(--accent) 45%, transparent)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="kicker" style={{ color: decided ? "var(--text-muted)" : "var(--accent)" }}>
          {decided === "approved"
            ? "approval · approved"
            : decided === "denied"
            ? "approval · denied"
            : "approval pending"}
        </div>
        <span className="font-[var(--font-mono)] text-[11px] text-[var(--text-subtle)]">
          {approval.draft_id}
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <div className="text-[20px] font-[var(--font-serif)]">
          ₹ {formatInr(approval.amount_inr)}
        </div>
        {approval.vendor?.name && (
          <div className="text-[13px] text-[var(--text-muted)] truncate">
            → {approval.vendor.name}
          </div>
        )}
      </div>
      {approval.approver_team && (
        <div className="text-[12px] text-[var(--text-subtle)] mt-1">
          routed to <span className="font-[var(--font-mono)]">{approval.approver_team}</span>
        </div>
      )}
      {!decided && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onDecide(approval, "approved")}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border transition-colors"
            style={{
              background: "color-mix(in oklab, var(--accent) 12%, transparent)",
              borderColor: "color-mix(in oklab, var(--accent) 45%, transparent)",
              color: "var(--text)",
            }}
          >
            <Check size={13} strokeWidth={2} /> approve
          </button>
          <button
            type="button"
            onClick={() => onDecide(approval, "denied")}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-strong)] hover:bg-[var(--elev-2)] text-[var(--text-muted)] transition-colors"
          >
            <X size={13} strokeWidth={2} /> deny
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ArtifactChip({
  artifact,
  baseUrl,
}: {
  artifact: ArtifactCard;
  baseUrl: string;
}) {
  const href = `${baseUrl}${artifact.download_url}`;
  return (
    <motion.a
      href={href}
      download={artifact.filename}
      target="_blank"
      rel="noreferrer"
      variants={fadeRise}
      initial="initial"
      animate="animate"
      className="inline-flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--elev-1)] hover:border-[var(--border-strong)] hover:bg-[var(--elev-2)] transition-colors max-w-[380px]"
    >
      <FileText size={16} strokeWidth={1.6} className="text-[var(--accent)] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[var(--text)] truncate">
          {artifact.filename}
        </div>
        <div className="text-[11px] text-[var(--text-subtle)] font-[var(--font-mono)]">
          {artifact.mime_type} · {formatBytes(artifact.size_bytes)}
        </div>
      </div>
      <span className="kicker text-[var(--accent)]">download</span>
    </motion.a>
  );
}

function formatInr(n?: number): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function ErrorBubble({ text }: { text: string }) {
  return (
    <div
      className="flex gap-3 items-start px-4 py-3 rounded-[var(--radius-md)] border"
      style={{
        background: "color-mix(in oklab, var(--danger) 8%, transparent)",
        borderColor: "color-mix(in oklab, var(--danger) 40%, transparent)",
      }}
      role="alert"
    >
      <span
        className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full"
        style={{ background: "var(--danger)" }}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="kicker mb-1" style={{ color: "var(--danger)" }}>
          agent error
        </div>
        <p className="text-[13.5px] leading-[1.6] text-[var(--text)] whitespace-pre-wrap break-words">
          {text}
        </p>
      </div>
    </div>
  );
}

/** Soften a raw upstream error into something a reader can act on. */
function formatAgentError(raw: string): string {
  if (/404.*NOT_FOUND/i.test(raw) && /models\//.test(raw)) {
    return (
      "The agent is running against a model that isn't available on " +
      "your API key or project. Check the model id in the agent's " +
      ".env and restart the server, or verify your project has access " +
      "to the preview model. Raw: " + raw
    );
  }
  if (/api key/i.test(raw)) {
    return (
      "No API key reached the server. Either set GOOGLE_API_KEY in the " +
      "agent's .env or export it in the shell before starting the " +
      "server. Raw: " + raw
    );
  }
  return raw;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
