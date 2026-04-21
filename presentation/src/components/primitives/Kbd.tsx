import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export function Kbd({ className, children, ...rest }: Props) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[22px] h-[22px] px-[6px]",
        "rounded-[6px] border border-[var(--border)]",
        "bg-[var(--elev-1)] text-[var(--text-muted)]",
        "text-[11px] font-medium font-[var(--font-mono)]",
        "shadow-[0_1px_0_oklch(0%_0_0/0.3)]",
        className
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
