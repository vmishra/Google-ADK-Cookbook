import { motion } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Props {
  title?: string;
  language?: string;
  children: ReactNode;
  x?: number;
  y?: number;
  className?: string;
  delay?: number;
}

/** Small floating code card for overlay inside a scene's canvas. */
export function CodeCard({
  title,
  language = "python",
  children,
  className,
  delay = 0,
}: Props) {
  return (
    <motion.div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)]",
        "bg-[color-mix(in_oklab,var(--surface-raised)_88%,transparent)]",
        "backdrop-blur-md shadow-[var(--shadow-2)]",
        "overflow-hidden",
        "w-[360px] max-w-full",
        className
      )}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay }}
    >
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border)]">
        <div className="kicker">{title ?? language}</div>
        <div className="font-mono text-[10px] text-[var(--text-faint)]">
          {language}
        </div>
      </div>
      <pre className="m-0 px-4 py-3 text-[12px] leading-[1.55] text-[var(--text)] overflow-x-auto">
        <code className="whitespace-pre">{children}</code>
      </pre>
    </motion.div>
  );
}
