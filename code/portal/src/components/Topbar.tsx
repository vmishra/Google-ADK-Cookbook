import { navigate } from "@/lib/router";
import { StatusDot } from "@/components/primitives/StatusDot";
import { ThemeToggle } from "@/components/primitives/ThemeToggle";

interface Props {
  crumb?: string;
  active?: boolean;
}

export function Topbar({ crumb, active = false }: Props) {
  return (
    <header
      className="flex items-center justify-between h-14 px-6 border-b"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--surface) 94%, transparent)",
        backdropFilter: "saturate(140%) blur(8px)",
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-baseline gap-2 focus-visible:outline-none"
          aria-label="Home"
        >
          <span className="font-[var(--font-serif)] italic text-[22px] leading-none text-[var(--text)] tracking-[-0.01em]">
            adk
          </span>
          <span
            className="inline-block h-[1px] w-5 translate-y-[-4px]"
            style={{ background: "var(--accent-hairline)" }}
          />
          <span className="text-[11px] tracking-[0.28em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
            reference
          </span>
        </button>
        {crumb && (
          <>
            <span className="text-[var(--text-faint)]" aria-hidden>/</span>
            <span className="text-[13px] text-[var(--text-muted)]">{crumb}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
          <StatusDot state={active ? "active" : "online"} />
          <span>{active ? "running" : "idle"}</span>
        </div>
        <span className="h-4 w-px bg-[var(--border)]" aria-hidden />
        <ThemeToggle />
      </div>
    </header>
  );
}
