import { motion } from "motion/react";
import { useSlideStore } from "@/state/useSlideStore";
import { cn } from "@/lib/cn";

/** Left rail: scene list with kickers. */
export function Sidebar() {
  const { slides, index, setIndex } = useSlideStore();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0",
        "w-[260px] border-r border-[var(--border)]",
        "bg-[var(--surface)]",
        "overflow-y-auto"
      )}
    >
      <div className="px-5 py-5">
        <div className="kicker mb-3">Scenes</div>
        <ol className="flex flex-col gap-0.5">
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setIndex(i)}
                  className={cn(
                    "group w-full text-left relative",
                    "flex items-baseline gap-3 px-3 py-2 -mx-3 rounded-lg",
                    "transition-colors duration-150",
                    active
                      ? "bg-[var(--elev-1)] text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)]/60"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[10px] tabular-nums w-6 shrink-0",
                      active
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-faint)]"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "font-mono text-[9.5px] tracking-[0.28em] uppercase",
                        active
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-faint)]"
                      )}
                    >
                      {s.chapter}
                    </div>
                    <div
                      className={cn(
                        "text-[13px] leading-tight mt-0.5",
                        active ? "font-medium" : "font-normal"
                      )}
                    >
                      {s.title}
                    </div>
                  </div>
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--accent)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
