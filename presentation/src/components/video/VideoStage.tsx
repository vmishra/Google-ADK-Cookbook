import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { CodeCard } from "@/components/diagrams/CodeCard";
import { Chip } from "@/components/primitives/Chip";
import { Kbd } from "@/components/primitives/Kbd";
import { StatusDot } from "@/components/primitives/StatusDot";
import { cn } from "@/lib/cn";
import { fadeRise, spring } from "@/lib/motion";
import { useSlideStore } from "@/state/useSlideStore";
import { NODES, FLOWS, BEATS, VIDEO_DURATION, type Beat } from "./scenes";
import { Play, Pause, RotateCcw, X } from "lucide-react";

/** Full-bleed cinematic. Tracks time along a timeline, asks scenes.ts
    which nodes + edges are active at each beat, animates accordingly. */
export function VideoStage() {
  const { togglePlay } = useSlideStore();
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (playing) {
        if (last.current != null) {
          setElapsed((e) => {
            const next = e + (now - last.current!) / 1000;
            return next > VIDEO_DURATION ? VIDEO_DURATION : next;
          });
        }
        last.current = now;
      } else {
        last.current = null;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key.toLowerCase() === "r") { setElapsed(0); setPlaying(true); }
      if (e.key === "Escape") { togglePlay(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // Compute currently-active beat and the set of visible nodes / live flows.
  const { visibleNodes, liveFlows, current, code } = useMemo(() => {
    const visible = new Set<string>();
    const live = new Set<string>();
    let curr: Beat | null = null;

    for (const beat of BEATS) {
      if (elapsed >= beat.t) {
        curr = beat;
        (beat.show ?? []).forEach((id) => visible.add(id));
      }
    }
    if (curr?.flows) curr.flows.forEach((id) => live.add(id));

    // Nodes that have been shown remain visible for the rest of the video.
    // The initial pair is always visible.
    ["user", "runner"].forEach((id) => visible.add(id));

    return {
      visibleNodes: visible,
      liveFlows: live,
      current: curr,
      code: curr?.code ?? null,
    };
  }, [elapsed]);

  const activeNodeSet = useMemo(() => {
    const s = new Set<string>();
    (current?.active ?? []).forEach((id) => s.add(id));
    return s;
  }, [current]);

  const nodeById = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])), []);

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--surface)] text-[var(--text)] grain">
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(70%_60%_at_50%_-10%,color-mix(in_oklab,var(--accent)_10%,transparent)_0%,transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(80%_60%_at_50%_120%,color-mix(in_oklab,var(--trace)_8%,transparent)_0%,transparent_70%)]" />

      {/* Top chrome — narration + close */}
      <div className="relative z-10 flex items-start justify-between px-10 pt-8">
        <div className="flex flex-col gap-3 max-w-[680px]">
          <div className="flex items-center gap-2">
            <StatusDot state="active" />
            <span className="kicker text-[var(--accent)]">tracing a request</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={current?.id ?? "t0"}
              className="font-serif italic text-[28px] leading-[1.3] text-[var(--text)]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={spring}
            >
              {current?.narration ?? "…"}
            </motion.p>
          </AnimatePresence>
        </div>
        <button
          onClick={togglePlay}
          className="w-9 h-9 grid place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)]"
          aria-label="Close trace"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex-1 min-h-0 px-4">
        <Canvas>
          {FLOWS.map((flow) => {
            const a = nodeById[flow.from];
            const b = nodeById[flow.to];
            if (!a || !b) return null;
            const shown = visibleNodes.has(a.id) && visibleNodes.has(b.id);
            if (!shown) return null;
            const live = liveFlows.has(flow.id);
            return (
              <Edge
                key={flow.id}
                from={{ x: a.x, y: a.y }}
                to={{ x: b.x, y: b.y }}
                tone={flow.tone ?? "accent"}
                curve={flow.curve ?? 0}
                label={live ? flow.label : undefined}
                arrow={flow.arrow ?? "forward"}
                travel={live}
                travelDuration={1.4}
                strokeWidth={live ? 1.6 : 1}
              />
            );
          })}
          {NODES.map((n) => {
            if (!visibleNodes.has(n.id)) return null;
            return (
              <Node
                key={n.id}
                x={n.x}
                y={n.y}
                w={n.w}
                h={n.h}
                kind={n.kind}
                tone={n.tone}
                kicker={n.kicker}
                title={n.title}
                subtitle={n.subtitle}
                active={activeNodeSet.has(n.id)}
              />
            );
          })}
        </Canvas>

        {/* Floating code card in the corner when a beat ships one.
            Anchored top-right so it sits above the scene graph's
            upper-right quadrant; the scene layout keeps nodes out of
            a ~340px × 240px box in that corner. */}
        <AnimatePresence>
          {code && (
            <motion.div
              key={code.title}
              className="absolute top-4 right-6 w-[320px] max-w-[calc(100%-48px)]"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={spring}
            >
              <CodeCard title={code.title}>{code.body}</CodeCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chip row — beat index */}
        <div className="absolute left-6 bottom-6 flex flex-wrap gap-1.5 max-w-[560px]">
          {BEATS.map((b, i) => {
            const reached = elapsed >= b.t;
            const isCurrent = current?.id === b.id;
            return (
              <Chip
                key={b.id}
                tone={isCurrent ? "accent" : reached ? "trace" : "neutral"}
                className={cn("h-[22px] text-[10px] tracking-[0.24em]", !reached && "opacity-40")}
              >
                {String(i).padStart(2, "0")}
              </Chip>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="absolute left-10 right-10 bottom-[84px]">
          <div className="relative h-[2px] bg-[var(--border)] rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-[var(--accent)]"
              style={{ width: `${(elapsed / VIDEO_DURATION) * 100}%` }}
              transition={spring}
            />
          </div>
          <div className="flex justify-between mt-1.5 font-mono text-[10px] text-[var(--text-faint)] tabular-nums">
            <span>{formatTime(elapsed)}</span>
            <span>{formatTime(VIDEO_DURATION)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div className="absolute right-6 bottom-[30px] flex items-center gap-2">
          <button
            onClick={() => { setElapsed(0); setPlaying(true); }}
            className="w-9 h-9 grid place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)]"
            aria-label="Restart"
            title="Restart (R)"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className={cn(
              "h-9 px-3 rounded-full text-[12px] font-medium",
              "border transition-colors duration-150 flex items-center gap-1.5",
              "border-[var(--accent-hairline)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            )}
            title="Play / pause (Space)"
          >
            {playing ? (
              <Pause size={14} strokeWidth={1.5} />
            ) : (
              <Play size={14} strokeWidth={1.5} />
            )}
            {playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      {/* Bottom chrome — shortcuts */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-10 pb-5 text-[11px] text-[var(--text-faint)] font-mono tracking-[0.1em]"
        variants={fadeRise}
        initial="initial"
        animate="animate"
      >
        <span>
          <Kbd>Space</Kbd> pause · <Kbd>R</Kbd> restart · <Kbd>Esc</Kbd> exit
        </span>
        <span>one request · one session · one event log</span>
      </motion.div>
    </div>
  );
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
