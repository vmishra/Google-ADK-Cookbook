import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  inset?: boolean;
  elev?: 1 | 2;
}

export function Panel({
  className,
  children,
  inset = false,
  elev = 1,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)]",
        "shadow-[var(--shadow-1)]",
        elev === 1
          ? "bg-[var(--elev-1)]"
          : "bg-[var(--elev-2)]",
        inset ? "p-4" : "p-5",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
