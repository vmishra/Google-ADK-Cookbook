import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "trace" | "success" | "danger";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  interactive?: boolean;
  children?: ReactNode;
}

const tones: Record<Tone, string> = {
  neutral:
    "bg-[var(--elev-1)] text-[var(--text-muted)] border-[var(--border)]",
  accent:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-hairline)]",
  trace:
    "bg-[var(--trace-soft)] text-[var(--trace)] border-[var(--trace-hairline)]",
  success:
    "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)] border-[color-mix(in_oklab,var(--success)_55%,transparent)]",
  danger:
    "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)] border-[color-mix(in_oklab,var(--danger)_55%,transparent)]",
};

export function Chip({
  tone = "neutral",
  interactive = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-6 rounded-full border",
        "px-2.5 text-[11px] leading-none font-medium tracking-[0.02em]",
        "whitespace-nowrap",
        tones[tone],
        interactive && "cursor-pointer hover:brightness-[1.1]",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
