import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useSlideStore } from "@/state/useSlideStore";
import { LEVEL_LABEL } from "@/lib/levels";
import { fadeRise } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Props {
  kicker: string;
  title: string;
  lede?: string;
  left: ReactNode;
  right: ReactNode;
}

/** One scene. Left pane is the editorial narration (chapter, title,
    a short lede, and deep-disclosure body). Right pane is the
    living diagram — always full-bleed, always breathing. */
export function Slide({ kicker, title, lede, left, right }: Props) {
  const { level } = useSlideStore();

  return (
    <div className="h-full w-full grid grid-cols-[minmax(360px,480px)_1fr]">
      {/* Left — text */}
      <motion.section
        className="relative flex flex-col overflow-y-auto border-r border-[var(--border)] px-10 py-12"
        variants={fadeRise}
        initial="initial"
        animate="animate"
      >
        <div className="kicker">{kicker}</div>
        <h1
          className={cn(
            "mt-3 font-medium tracking-[-0.012em] text-[var(--text)]",
            "text-[clamp(1.9rem,2.4vw,2.4rem)] leading-[1.08]"
          )}
        >
          {title}
        </h1>
        {lede && (
          <p
            className="mt-4 text-[15px] leading-[1.55] text-[var(--text-muted)]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {lede}
          </p>
        )}
        <div className="mt-6 mb-8 w-[120px] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-hairline)] to-transparent" />

        <div className="flex items-center gap-2 mb-5">
          <span className="kicker text-[var(--text-faint)]">Depth</span>
          <span className="font-mono text-[11px] text-[var(--accent)]">
            {LEVEL_LABEL[level]}
          </span>
        </div>

        <div className="flex-1 prose prose-invert max-w-none">
          {left}
        </div>
      </motion.section>

      {/* Right — living canvas */}
      <motion.section
        className="relative overflow-hidden grain"
        variants={fadeRise}
        initial="initial"
        animate="animate"
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_10%,color-mix(in_oklab,var(--accent)_6%,transparent)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_110%,color-mix(in_oklab,var(--trace)_8%,transparent)_0%,transparent_70%)]" />
        <div className="relative h-full w-full flex items-center justify-center p-10">
          {right}
        </div>
      </motion.section>
    </div>
  );
}
