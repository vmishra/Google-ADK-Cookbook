import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { findAgent } from "@/data/agents";
import { Topbar } from "@/components/Topbar";
import { Chip } from "@/components/primitives/Chip";
import { ChatPanel } from "@/components/agent/ChatPanel";
import { VoicePanel } from "@/components/agent/VoicePanel";
import { ComputerUsePane } from "@/components/agent/ComputerUsePane";
import { EvalPanel } from "@/components/agent/EvalPanel";
import { MetricsRibbon } from "@/components/agent/MetricsRibbon";
import { AgentArchitecture } from "@/components/agent/AgentArchitecture";
import { fadeRise } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";

type LeftTab = "overview" | "architecture";

interface Props {
  id: string;
}

const LEFT_WIDTH_KEY = "portal:leftPaneWidth";
const LEFT_MIN = 280;
const LEFT_MAX_RATIO = 0.7; // never more than 70% of the viewport
const LEFT_DEFAULT = 380;

function readStoredLeftWidth(): number {
  if (typeof window === "undefined") return LEFT_DEFAULT;
  const raw = window.localStorage.getItem(LEFT_WIDTH_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= LEFT_MIN ? n : LEFT_DEFAULT;
}

export function AgentPage({ id }: Props) {
  const agent = findAgent(id);
  const [active, setActive] = useState(false);
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("overview");
  const [leftWidth, setLeftWidth] = useState<number>(() => readStoredLeftWidth());
  const [dragging, setDragging] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const clampWidth = useCallback((px: number) => {
    const max = Math.max(LEFT_MIN + 120, Math.round(window.innerWidth * LEFT_MAX_RATIO));
    return Math.min(max, Math.max(LEFT_MIN, Math.round(px)));
  }, []);

  useEffect(() => {
    const onResize = () => setLeftWidth((w) => clampWidth(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampWidth]);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const shell = shellRef.current;
      if (!shell) return;
      const shellLeft = shell.getBoundingClientRect().left;
      setDragging(true);

      const onMove = (ev: PointerEvent) => {
        setLeftWidth(clampWidth(ev.clientX - shellLeft));
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setLeftWidth((w) => {
          window.localStorage.setItem(LEFT_WIDTH_KEY, String(w));
          return w;
        });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [clampWidth],
  );

  const resetWidth = useCallback(() => {
    setLeftWidth(LEFT_DEFAULT);
    window.localStorage.setItem(LEFT_WIDTH_KEY, String(LEFT_DEFAULT));
  }, []);

  if (!agent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Topbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="font-[var(--font-serif)] italic text-[22px] text-[var(--text-muted)] mb-4">
              Nothing at that address.
            </p>
            <button
              onClick={() => navigate("/")}
              className="text-[13px] font-medium text-[var(--accent)] hover:brightness-[1.1]"
            >
              Return to the grid →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-[var(--surface)]",
        dragging && "select-none cursor-col-resize",
      )}
    >
      <Topbar crumb={`${agent.number} · ${agent.title}`} active={active} />
      <div ref={shellRef} className="flex-1 flex overflow-hidden">
        <aside
          className="shrink-0 border-r border-[var(--border)] flex flex-col min-h-0"
          style={{ width: leftWidth, background: "var(--surface-raised)" }}
        >
          <LeftTabs tab={leftTab} onChange={setLeftTab} />
          <div className="flex-1 overflow-auto">
            {leftTab === "overview" ? (
              <LeftColumn agent={agent} />
            ) : (
              <AgentArchitecture baseUrl={agent.baseUrl} activeAuthor={activeAuthor} />
            )}
          </div>
        </aside>
        <PaneResizer
          onPointerDown={startDrag}
          onDoubleClick={resetWidth}
          active={dragging}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-[var(--border)] px-5 py-3 bg-[var(--surface)]">
            <MetricsRibbon baseUrl={agent.baseUrl} />
          </div>
          <div className="flex-1 min-h-0">
            {agent.modality === "voice" ? (
              <VoicePanel
                baseUrl={agent.baseUrl}
                onActive={setActive}
              />
            ) : agent.modality === "eval" ? (
              <EvalPanel baseUrl={agent.baseUrl} onActive={setActive} />
            ) : agent.modality === "computer-use" && agent.dashboardUrl ? (
              <ComputerUsePane
                baseUrl={agent.baseUrl}
                prompts={agent.prompts}
                dashboardUrl={agent.dashboardUrl}
                onActive={setActive}
                onAuthor={setActiveAuthor}
              />
            ) : (
              <ChatPanel
                baseUrl={agent.baseUrl}
                prompts={agent.prompts}
                onActive={setActive}
                onAuthor={setActiveAuthor}
                showAuthor={agent.modality === "deep-research"}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PaneResizer({
  onPointerDown,
  onDoubleClick,
  active,
}: {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  active: boolean;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative shrink-0 cursor-col-resize group",
        "w-[6px] -mx-[3px] z-10",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors",
          active
            ? "bg-[var(--accent)]"
            : "bg-[var(--border)] group-hover:bg-[var(--accent)]",
        )}
      />
    </div>
  );
}

function LeftTabs({ tab, onChange }: { tab: LeftTab; onChange: (t: LeftTab) => void }) {
  const tabs: { id: LeftTab; label: string }[] = [
    { id: "overview", label: "overview" },
    { id: "architecture", label: "architecture" },
  ];
  return (
    <div
      className="flex items-stretch px-3 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "relative h-11 px-3 text-[10.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] font-medium transition-colors",
              active ? "text-[var(--text)]" : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]",
            )}
          >
            {t.label}
            {active && (
              <span
                className="absolute inset-x-2.5 bottom-0 h-[2px]"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function LeftColumn({ agent }: { agent: ReturnType<typeof findAgent> & {} }) {
  return (
    <motion.div variants={fadeRise} initial="initial" animate="animate" className="p-6 space-y-8">
      <div>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-[var(--font-mono)] text-[var(--text-subtle)] text-[11px] tracking-[0.18em]">
            {agent.number}
          </span>
          <span className="kicker">{agent.kicker}</span>
        </div>
        <h1 className="font-[var(--font-serif)] text-[44px] leading-[1.04] font-medium tracking-[-0.02em]">
          {agent.title}
        </h1>
        <motion.div
          className="hairline mt-5"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1], delay: 0.15 }}
          style={{ width: 140, transformOrigin: "left" }}
        />
        <p className="font-[var(--font-serif)] italic text-[16px] text-[var(--text-muted)] mt-4 leading-[1.55]">
          {agent.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="accent">{agent.pattern}</Chip>
        {agent.models.map((m) => (
          <Chip key={m} tone="trace">
            <span className="font-[var(--font-mono)]">{m}</span>
          </Chip>
        ))}
      </div>

      <Section label="what this does">
        <p className="text-[14px] leading-[1.6] text-[var(--text-muted)]">
          {agent.summary}
        </p>
      </Section>

      <Section label="what to notice">
        <ul className="space-y-2.5">
          {agent.notice.map((n, i) => (
            <li key={i} className="text-[13.5px] leading-[1.55] text-[var(--text-muted)] flex gap-3">
              <span className="text-[var(--accent)] mt-[6px] h-[1px] w-3 bg-[var(--accent-hairline)] shrink-0" />
              {n}
            </li>
          ))}
        </ul>
      </Section>

      <Section label="prompts worth trying">
        <ul className="space-y-2">
          {agent.prompts.map((p, i) => (
            <li
              key={i}
              className="text-[13px] text-[var(--text-muted)] italic leading-[1.55] font-[var(--font-serif)]"
            >
              “{p}”
            </li>
          ))}
        </ul>
      </Section>

      <Section label="endpoint">
        <div className="font-[var(--font-mono)] text-[12px] text-[var(--text-muted)] space-y-1">
          <div>{agent.baseUrl}</div>
          {agent.dashboardUrl && <div>{agent.dashboardUrl}</div>}
        </div>
      </Section>
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="kicker mb-2.5">{label}</div>
      {children}
    </section>
  );
}
