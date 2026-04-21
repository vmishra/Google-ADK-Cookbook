import * as Dialog from "@radix-ui/react-dialog";
import { useState, useMemo } from "react";
import { Search, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSlideStore } from "@/state/useSlideStore";
import { quickOut } from "@/lib/motion";
import { cn } from "@/lib/cn";

export function CommandPalette() {
  const { slides, setIndex, paletteOpen, setPaletteOpen } = useSlideStore();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return slides.map((s, i) => ({ s, i }));
    return slides
      .map((s, i) => ({ s, i }))
      .filter(
        ({ s }) =>
          s.title.toLowerCase().includes(n) ||
          s.chapter.toLowerCase().includes(n) ||
          s.kicker.toLowerCase().includes(n)
      );
  }, [q, slides]);

  const jump = (idx: number) => {
    setIndex(idx);
    setPaletteOpen(false);
    setQ("");
    setCursor(0);
  };

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <AnimatePresence>
        {paletteOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-[oklch(0%_0_0/0.6)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={quickOut}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  "fixed z-50 left-1/2 top-[16%] -translate-x-1/2",
                  "w-full max-w-[640px] px-4"
                )}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              >
                <Dialog.Title className="sr-only">Jump to a scene</Dialog.Title>
                <div
                  className={cn(
                    "rounded-[var(--radius-2xl)] border border-[var(--border)]",
                    "bg-[var(--elev-1)]",
                    "shadow-[var(--shadow-lift)]"
                  )}
                >
                  <div className="flex items-center gap-3 px-4 h-[52px] border-b border-[var(--border)]">
                    <Search
                      size={16}
                      strokeWidth={1.5}
                      className="text-[var(--text-subtle)]"
                    />
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setCursor(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setCursor((c) => Math.min(c + 1, filtered.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setCursor((c) => Math.max(c - 1, 0));
                        } else if (e.key === "Enter") {
                          const choice = filtered[cursor];
                          if (choice) jump(choice.i);
                        }
                      }}
                      placeholder="Jump to any scene"
                      className="flex-1 bg-transparent outline-none text-[14px] text-[var(--text)] placeholder:text-[var(--text-subtle)]"
                    />
                  </div>
                  <ul className="max-h-[420px] overflow-y-auto py-2">
                    {filtered.map(({ s, i }, idx) => {
                      const selected = idx === cursor;
                      return (
                        <li key={s.id}>
                          <button
                            onMouseEnter={() => setCursor(idx)}
                            onClick={() => jump(i)}
                            className={cn(
                              "w-full text-left px-4 py-2 flex items-center gap-3",
                              "transition-colors duration-100",
                              selected
                                ? "bg-[var(--elev-2)] text-[var(--text)]"
                                : "text-[var(--text-muted)]"
                            )}
                          >
                            <span className="font-mono text-[10px] tabular-nums text-[var(--text-faint)] w-6">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-[9.5px] tracking-[0.28em] uppercase text-[var(--text-faint)]">
                                {s.chapter}
                              </div>
                              <div className="text-[13px] mt-0.5">{s.title}</div>
                            </div>
                            {selected && (
                              <ArrowRight
                                size={14}
                                strokeWidth={1.5}
                                className="text-[var(--accent)]"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
