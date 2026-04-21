import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { useSlideStore } from "@/state/useSlideStore";
import { fadeRise } from "@/lib/motion";

interface Props {
  children: ReactNode;
}

/** Dual-pane workspace per DESIGN.md §8.1.
    Topbar + left rail + chat-width text + flex canvas. */
export function Shell({ children }: Props) {
  const { next, prev, setLevel, togglePlay, setPaletteOpen, paletteOpen, index } =
    useSlideStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (paletteOpen) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      if (e.key === " " || e.key.toLowerCase() === "v") {
        e.preventDefault(); togglePlay();
      }
      if (e.key === "1") setLevel("beginner");
      if (e.key === "2") setLevel("intermediate");
      if (e.key === "3") setLevel("advanced");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, setLevel, togglePlay, paletteOpen, setPaletteOpen]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--surface)] text-[var(--text)] overflow-hidden">
      <Topbar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="absolute inset-0"
              variants={fadeRise}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
