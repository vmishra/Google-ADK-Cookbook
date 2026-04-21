import { motion } from "motion/react";
import { spring } from "@/lib/motion";

interface Props {
  x: number;
  y: number;
  anchor?: "left" | "right" | "top" | "bottom";
  kicker?: string;
  text: string;
  delay?: number;
}

/** Small pointer+caption used to label parts of a diagram. */
export function Annotation({
  x,
  y,
  anchor = "right",
  kicker,
  text,
  delay = 0,
}: Props) {
  const off = 56;
  const tx =
    anchor === "right" ? x + off :
    anchor === "left" ? x - off :
    x;
  const ty =
    anchor === "top" ? y - off :
    anchor === "bottom" ? y + off :
    y;

  const textAnchor = anchor === "left" ? "end" : "start";

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...spring, delay }}
    >
      <line
        x1={x}
        y1={y}
        x2={tx}
        y2={ty}
        stroke="var(--border-strong)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <circle cx={x} cy={y} r={3} fill="var(--accent)" />
      {kicker && (
        <text
          x={tx + (anchor === "left" ? -6 : 6)}
          y={ty}
          fontFamily="var(--font-mono)"
          fontSize="9"
          letterSpacing="2.2"
          fill="var(--accent)"
          style={{ textTransform: "uppercase" }}
          textAnchor={textAnchor}
        >
          {kicker}
        </text>
      )}
      <text
        x={tx + (anchor === "left" ? -6 : 6)}
        y={ty + 14}
        fontFamily="var(--font-sans)"
        fontSize="12"
        fill="var(--text-muted)"
        textAnchor={textAnchor}
      >
        {text}
      </text>
    </motion.g>
  );
}
