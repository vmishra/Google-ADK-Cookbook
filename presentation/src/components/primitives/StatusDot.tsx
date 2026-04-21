import { cn } from "@/lib/cn";

interface Props {
  state?: "idle" | "online" | "active";
  className?: string;
}

export function StatusDot({ state = "online", className }: Props) {
  const color =
    state === "active"
      ? "var(--accent)"
      : state === "online"
        ? "var(--success)"
        : "var(--border-strong)";

  return (
    <span className={cn("relative inline-flex", className)} aria-hidden>
      <span
        className="absolute inline-flex h-2 w-2 rounded-full opacity-70"
        style={{
          background: color,
          animation: state === "active" ? "adk-ping 1.8s ease-out infinite" : "none",
        }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      <style>{`
        @keyframes adk-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
