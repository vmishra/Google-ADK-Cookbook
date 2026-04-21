import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "soft" | "ghost" | "outline";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[13px]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[oklch(16%_0_0)] hover:brightness-[1.04] active:brightness-[0.98] shadow-[var(--shadow-1)]",
  soft:
    "bg-[var(--elev-1)] text-[var(--text)] hover:bg-[var(--elev-2)] border border-[var(--border)]",
  ghost:
    "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)]",
  outline:
    "bg-transparent border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)]",
};

export function Button({
  variant = "soft",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium",
        "transition-[background-color,color,box-shadow,filter,border-color]",
        "duration-150 ease-out",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
