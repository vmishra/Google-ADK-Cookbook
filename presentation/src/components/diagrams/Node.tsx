import { motion } from "motion/react";
import { spring } from "@/lib/motion";

type Kind = "agent" | "tool" | "service" | "model" | "user" | "io";
type Tone = "default" | "accent" | "trace" | "muted";

interface Props {
  x: number;
  y: number;
  w?: number;
  h?: number;
  kind?: Kind;
  tone?: Tone;
  kicker?: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  delay?: number;
}

const kindKicker: Record<Kind, string> = {
  agent: "AGENT",
  tool: "TOOL",
  service: "SERVICE",
  model: "MODEL",
  user: "USER",
  io: "I/O",
};

/** A named box. Centered at (x, y). Active nodes get an animated
    accent ring. Colour is driven by tone, not kind — so the same
    agent can render neutral or highlighted per scene beat. */
export function Node({
  x,
  y,
  w = 196,
  h = 76,
  kind = "agent",
  tone = "default",
  kicker,
  title,
  subtitle,
  active = false,
  delay = 0,
}: Props) {
  const left = x - w / 2;
  const top = y - h / 2;

  const stroke =
    tone === "accent"
      ? "var(--accent-hairline)"
      : tone === "trace"
        ? "var(--trace-hairline)"
        : "var(--border-strong)";

  const fill =
    tone === "accent"
      ? "color-mix(in oklab, var(--accent) 6%, var(--elev-1))"
      : tone === "trace"
        ? "color-mix(in oklab, var(--trace) 6%, var(--elev-1))"
        : "var(--elev-1)";

  const titleColour =
    tone === "accent"
      ? "var(--accent)"
      : tone === "trace"
        ? "var(--trace)"
        : "var(--text)";

  return (
    <motion.g
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
    >
      {active && (
        <motion.rect
          x={left - 6}
          y={top - 6}
          width={w + 12}
          height={h + 12}
          rx={18}
          fill="transparent"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeOpacity={0}
          initial={{ strokeOpacity: 0 }}
          animate={{ strokeOpacity: [0, 0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={12}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        filter={tone === "accent" && active ? "url(#soft-glow)" : undefined}
      />
      <text
        x={left + 14}
        y={top + 22}
        fontFamily="var(--font-mono)"
        fontSize="9.5"
        letterSpacing="2.4"
        fill={
          tone === "accent"
            ? "var(--accent)"
            : tone === "trace"
              ? "var(--trace)"
              : "var(--text-faint)"
        }
        style={{ textTransform: "uppercase" }}
      >
        {kicker ?? kindKicker[kind]}
      </text>
      <text
        x={left + 14}
        y={top + 42}
        fontFamily="var(--font-sans)"
        fontSize="15"
        fontWeight={500}
        fill={titleColour}
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={left + 14}
          y={top + 60}
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--text-subtle)"
        >
          {subtitle}
        </text>
      )}
    </motion.g>
  );
}
