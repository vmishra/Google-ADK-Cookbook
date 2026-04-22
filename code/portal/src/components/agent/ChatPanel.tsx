import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, Wrench, CircleDot } from "lucide-react";

import { streamSSE } from "@/lib/sse";
import { chipEnter, fadeRise, spring } from "@/lib/motion";
import { Chip } from "@/components/primitives/Chip";

interface Props {
  baseUrl: string;
  prompts: string[];
  onTurn?: (metrics: any) => void;
  onActive?: (active: boolean) => void;
  showAuthor?: boolean;
}

type Turn =
  | { kind: "user"; text: string }
  | {
      kind: "model";
      text: string;
      toolCalls: { name: string; args: any }[];
      author?: string;
      complete: boolean;
    };

export function ChatPanel({ baseUrl, prompts, onTurn, onActive, showAuthor }: Props) {
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
                toolCalls: [...last.toolCalls, { name: evt.name, args: evt.args }],
                author: evt.author ?? last.author,
              };
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
        } else if (evt.kind === "turn_complete") {
          setTurns((arr) => {
            const copy = [...arr];
            const last = copy[copy.length - 1];
            if (last?.kind === "model") {
              copy[copy.length - 1] = { ...last, complete: true };
            }
            return copy;
          });
          if (evt.metrics) onTurn?.(evt.metrics);
        } else if (evt.kind === "error") {
          setTurns((arr) => [
            ...arr,
            { kind: "model", text: `[agent error] ${evt.data}`, toolCalls: [], complete: true },
          ]);
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setTurns((arr) => [
          ...arr,
          { kind: "model", text: `[stream error] ${e.message}`, toolCalls: [], complete: true },
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
    <div className="flex flex-col h-full bg-[var(--elev-1)]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-6 py-6 space-y-5"
        aria-live="polite"
      >
        {turns.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <motion.p
              variants={fadeRise}
              initial="initial"
              animate="animate"
              className="font-[var(--font-serif)] italic text-[var(--text-muted)] text-[22px] text-center max-w-[360px]"
            >
              What shall we arrange?
            </motion.p>
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
              ) : (
                <ModelBubble turn={t} showAuthor={showAuthor} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {turns.length === 0 && prompts.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {prompts.slice(0, 3).map((p) => (
            <motion.div key={p} variants={chipEnter} initial="initial" animate="animate">
              <Chip tone="trace" interactive onClick={() => send(p)}>
                {truncate(p, 64)}
              </Chip>
            </motion.div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t border-[var(--border)] px-5 py-4 flex items-end gap-3 bg-[var(--elev-2)]"
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
          className="flex-1 resize-none bg-[var(--surface)] border border-[var(--border-strong)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[14px] text-[var(--text)] font-[var(--font-sans)] placeholder:text-[var(--text-subtle)] focus-visible:outline-none focus-within:border-[var(--accent)] min-h-[40px] max-h-[160px] shadow-[var(--shadow-1)]"
          style={{ height: "auto" }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send message"
          className="h-10 w-10 rounded-full bg-[var(--accent)] text-[oklch(16%_0_0)] flex items-center justify-center disabled:opacity-35 hover:brightness-[1.04] active:brightness-[0.98] transition-[filter,opacity]"
          style={{ transition: "filter 150ms, opacity 180ms ease" }}
        >
          <Send size={16} strokeWidth={1.8} />
        </button>
      </form>
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
    <div className="flex flex-col gap-2 max-w-[78%]">
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
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
