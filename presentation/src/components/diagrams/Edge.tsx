import { motion } from "motion/react";
import { useId } from "react";

type Tone = "accent" | "trace" | "muted";

interface Props {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Curvature: 0 = straight, positive bends below, negative bends above. */
  curve?: number;
  tone?: Tone;
  label?: string;
  dashed?: boolean;
  /** Show a traveling dot along the path. */
  travel?: boolean;
  travelDuration?: number;
  /** Delay the edge draw by this many seconds. */
  delay?: number;
  /** Direction of the arrowhead: "forward" (at `to`), "back" (at `from`), "both", "none". */
  arrow?: "forward" | "back" | "both" | "none";
  strokeWidth?: number;
}

/** Edge between two points. Draws in with stroke-dashoffset, optionally
    travels a dot along the path. Keep edges reasonable — long paths
    make the whole scene feel sluggish. */
export function Edge({
  from,
  to,
  curve = 0,
  tone = "accent",
  label,
  dashed = false,
  travel = false,
  travelDuration = 1.6,
  delay = 0,
  arrow = "forward",
  strokeWidth = 1.25,
}: Props) {
  const id = useId();
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular vector for curve offset
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * curve;
  const cy = my + ny * curve;

  const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

  const stroke =
    tone === "accent"
      ? "var(--accent)"
      : tone === "trace"
        ? "var(--trace)"
        : "var(--border-strong)";

  const markerEnd =
    arrow === "forward" || arrow === "both"
      ? `url(#arrow-${tone})`
      : undefined;
  const markerStart =
    arrow === "back" || arrow === "both"
      ? `url(#arrow-${tone})`
      : undefined;

  return (
    <g>
      <motion.path
        id={id}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "4 6" : "none"}
        strokeLinecap="round"
        markerEnd={markerEnd}
        markerStart={markerStart}
        initial={{ pathLength: 0, opacity: 0.6 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}
      />
      {travel && (
        <motion.circle
          r={3.5}
          fill={stroke}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: travelDuration,
            delay: delay + 0.6,
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        >
          <animateMotion
            dur={`${travelDuration}s`}
            repeatCount="indefinite"
            begin={`${delay + 0.6}s`}
            rotate="auto"
          >
            <mpath href={`#${CSS.escape(id)}`} />
          </animateMotion>
        </motion.circle>
      )}
      {label && (
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="10"
          letterSpacing="1.2"
          fill="var(--text-subtle)"
          style={{ textTransform: "uppercase" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
