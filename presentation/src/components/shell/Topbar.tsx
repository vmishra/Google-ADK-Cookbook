import { Command, Play, PauseCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useSlideStore } from "@/state/useSlideStore";
import { LEVEL_ORDER, LEVEL_SHORT } from "@/lib/levels";
import { StatusDot } from "@/components/primitives/StatusDot";
import { Kbd } from "@/components/primitives/Kbd";
import { cn } from "@/lib/cn";

export function Topbar() {
  const {
    index,
    slides,
    next,
    prev,
    playMode,
    togglePlay,
    level,
    setLevel,
    setPaletteOpen,
  } = useSlideStore();

  const current = slides[index];

  return (
    <div
      className={cn(
        "h-14 flex items-center justify-between",
        "px-4 border-b border-[var(--border)]",
        "bg-[var(--surface)]/75 backdrop-blur-[10px]",
        "[backdrop-filter:saturate(1.15)_blur(10px)]"
      )}
    >
      {/* Left — wordmark + live status */}
      <div className="flex items-center gap-4">
        <Wordmark />
        <div className="hidden md:flex items-center gap-2 pl-4 ml-2 border-l border-[var(--border)]">
          <StatusDot state={playMode ? "active" : "online"} />
          <span className="kicker">
            {playMode ? "tracing" : current?.chapter ?? "loading"}
          </span>
        </div>
      </div>

      {/* Center — command palette trigger */}
      <button
        onClick={() => setPaletteOpen(true)}
        className={cn(
          "hidden md:flex items-center gap-2",
          "h-9 min-w-[300px] px-3 rounded-full",
          "bg-[var(--elev-1)] border border-[var(--border)]",
          "text-[var(--text-muted)] hover:text-[var(--text)]",
          "transition-colors duration-150"
        )}
      >
        <Command size={14} strokeWidth={1.5} />
        <span className="text-[13px] flex-1 text-left truncate">
          {current?.title ?? "Jump to any scene"}
        </span>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </button>

      {/* Right — level + play + nav */}
      <div className="flex items-center gap-3">
        {/* Level segmented */}
        <div className="hidden md:flex items-center p-[2px] bg-[var(--elev-1)] border border-[var(--border)] rounded-full relative">
          {LEVEL_ORDER.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "relative px-2.5 h-7 text-[10.5px] tracking-[0.28em] uppercase font-mono",
                "transition-colors duration-150 z-10",
                level === l
                  ? "text-[oklch(16%_0_0)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              {level === l && (
                <motion.span
                  layoutId="level-pill"
                  className="absolute inset-0 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{LEVEL_SHORT[l]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            aria-label="Previous"
            className="w-9 h-9 grid place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)]"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
          <div className="font-mono text-[11px] text-[var(--text-subtle)] w-14 text-center tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </div>
          <button
            onClick={next}
            aria-label="Next"
            className="w-9 h-9 grid place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)]"
          >
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </div>

        <button
          onClick={togglePlay}
          className={cn(
            "h-9 px-3 rounded-full text-[12px] font-medium tracking-[0.02em]",
            "border transition-colors duration-150",
            "flex items-center gap-1.5",
            playMode
              ? "bg-[var(--accent-soft)] border-[var(--accent-hairline)] text-[var(--accent)]"
              : "border-[var(--accent-hairline)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          )}
        >
          {playMode ? (
            <PauseCircle size={14} strokeWidth={1.5} />
          ) : (
            <Play size={14} strokeWidth={1.5} />
          )}
          <span>{playMode ? "Stop trace" : "Trace a request"}</span>
        </button>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-7 h-7 grid place-items-center">
        <span
          className="absolute inset-0 rounded-full border border-[var(--accent-hairline)]"
          style={{ animation: "adk-breathe 5.5s ease-out infinite" }}
        />
        <span
          className="absolute inset-[3px] rounded-full border border-[var(--accent-hairline)]"
          style={{ animation: "adk-breathe 5.5s ease-out 1.6s infinite" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
          style={{ boxShadow: "0 0 12px var(--accent-hairline)" }}
        />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-medium text-[14px] tracking-[-0.01em]">ADK</span>
        <span className="kicker">in motion</span>
      </div>
      <style>{`
        @keyframes adk-breathe {
          0%   { transform: scale(0.92); opacity: 0.18; }
          70%  { transform: scale(1.45); opacity: 0;    }
          100% { transform: scale(1.5);  opacity: 0;    }
        }
      `}</style>
    </div>
  );
}
