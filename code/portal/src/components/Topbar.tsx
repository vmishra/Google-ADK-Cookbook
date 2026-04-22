import { navigate } from "@/lib/router";
import { StatusDot } from "@/components/primitives/StatusDot";

interface Props {
  crumb?: string;
  active?: boolean;
}

export function Topbar({ crumb, active = false }: Props) {
  return (
    <div
      className="flex items-center justify-between h-12 px-6 border-b border-[var(--border)]"
      style={{ background: "color-mix(in oklab, var(--surface) 92%, transparent)" }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[13px] font-medium tracking-[0.04em] hover:text-[var(--accent)] transition-colors"
          aria-label="Go home"
        >
          <span className="font-[var(--font-serif)] italic text-[18px] leading-none translate-y-[-1px]">
            adk
          </span>
          <span className="kicker">workshop</span>
        </button>
        {crumb && (
          <>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="text-[13px] text-[var(--text-muted)]">{crumb}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] tracking-[0.18em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
        <StatusDot state={active ? "active" : "online"} />
        <span>{active ? "agent responding" : "standby"}</span>
      </div>
    </div>
  );
}
