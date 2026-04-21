import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  viewBox?: string;
  className?: string;
  children: ReactNode;
}

/** SVG canvas for diagram primitives. Coordinates are in viewBox
    units — by default 1000 × 640, roughly the aspect of the right
    pane at common screen widths. Use the {@link CanvasGrid} helper
    during layout; remove before ship. */
export function Canvas({
  viewBox = "0 0 1000 640",
  className,
  children,
}: Props) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("w-full h-full overflow-visible", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="arrow-accent"
          viewBox="0 0 10 10"
          refX="9" refY="5"
          markerWidth="7" markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
        </marker>
        <marker
          id="arrow-trace"
          viewBox="0 0 10 10"
          refX="9" refY="5"
          markerWidth="7" markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--trace)" />
        </marker>
        <marker
          id="arrow-muted"
          viewBox="0 0 10 10"
          refX="9" refY="5"
          markerWidth="6" markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--border-strong)" />
        </marker>
        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

/** Layout helper — draws a faint grid. Only enable during development. */
export function CanvasGrid({ step = 40, w = 1000, h = 640 }: { step?: number; w?: number; h?: number }) {
  const lines = [];
  for (let x = 0; x <= w; x += step) {
    lines.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={h} stroke="var(--border)" strokeOpacity={0.3} strokeWidth={0.5} />);
  }
  for (let y = 0; y <= h; y += step) {
    lines.push(<line key={`hy${y}`} x1={0} y1={y} x2={w} y2={y} stroke="var(--border)" strokeOpacity={0.3} strokeWidth={0.5} />);
  }
  return <g>{lines}</g>;
}
