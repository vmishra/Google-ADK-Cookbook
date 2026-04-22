import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, Wrench, CircleDot } from "lucide-react";

import { streamSSE } from "@/lib/sse";
import { chipEnter, fadeRise, spring } from "@/lib/motion";
import { Chip } from "@/components/primitives/Chip";
import { TurnTelemetry } from "./TurnTelemetry";

interface Props {
  baseUrl: string;
  prompts: string[];
  onTurn?: (metrics: any) => void;
  onActive?: (active: boolean) => void;
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

type Turn =
  | { kind: "user"; text: string }
  | {
      kind: "model";
      text: string;
      toolCalls: ToolExchange[];
      author?: string;
      complete: boolean;
      metrics?: TurnMetrics;
    }
  | { kind: "error"; text: string };

export function ChatPanel({ baseUrl, prompts, onActive, showAuthor }: Props) {
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
      { kind: "model", text: "", toolCalls: [], complete: false },
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
                  <ModelBubble turn={t} showAuthor={showAuthor} />
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

function ModelBubble({ turn, showAuthor }: { turn: Extract<Turn, { kind: "model" }>; showAuthor?: boolean }) {
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
          className="text-[14px] leading-[1.6] whitespace-pre-wrap"
        >
          {turn.text}
          {!turn.complete && <span className="opacity-50 ml-0.5">…</span>}
        </motion.div>
      )}
      {!turn.text && turn.toolCalls.length === 0 && !turn.complete && (
        <div className="text-[13px] text-[var(--text-subtle)] italic">considering…</div>
      )}
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
