/**
 * Polls /health on the agent's base URL every 6 s.
 * Emits a dot: green when reachable, muted when not.
 * Intentionally silent on failure — we do not want red errors on a
 * browsed index; we want a calm "ready / not ready" signal.
 */
import { useEffect, useState } from "react";

interface Props {
  baseUrl: string;
  intervalMs?: number;
}

type Status = "unknown" | "up" | "down";

export function LiveStatus({ baseUrl, intervalMs = 6000 }: Props) {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const r = await fetch(`${baseUrl}/health`, { cache: "no-store" });
        if (!alive) return;
        setStatus(r.ok ? "up" : "down");
      } catch {
        if (alive) setStatus("down");
      }
    };
    ping();
    const t = setInterval(ping, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [baseUrl, intervalMs]);

  const color =
    status === "up" ? "var(--success)" :
    status === "down" ? "var(--text-faint)" :
    "var(--border-strong)";
  const label =
    status === "up" ? "online" :
    status === "down" ? "offline" :
    "checking";

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.22em] uppercase font-[var(--font-mono)]"
      style={{ color: status === "up" ? "var(--success)" : "var(--text-subtle)" }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
