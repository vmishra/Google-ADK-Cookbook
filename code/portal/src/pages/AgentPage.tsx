import { useState } from "react";
import { motion } from "motion/react";

import { findAgent } from "@/data/agents";
import { Topbar } from "@/components/Topbar";
import { Chip } from "@/components/primitives/Chip";
import { ChatPanel } from "@/components/agent/ChatPanel";
import { VoicePanel } from "@/components/agent/VoicePanel";
import { ComputerUsePane } from "@/components/agent/ComputerUsePane";
import { MetricsRibbon } from "@/components/agent/MetricsRibbon";
import { AgentArchitecture } from "@/components/agent/AgentArchitecture";
import { fadeRise } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";

type LeftTab = "overview" | "architecture";

interface Props {
  id: string;
}

export function AgentPage({ id }: Props) {
  const agent = findAgent(id);
  const [active, setActive] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("overview");

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
    <div className="h-screen flex flex-col bg-[var(--surface)]">
      <Topbar crumb={`${agent.number} · ${agent.title}`} active={active} />
      <div className="flex-1 flex overflow-hidden">
        <aside
          className="w-[380px] shrink-0 border-r border-[var(--border)] flex flex-col min-h-0"
          style={{ background: "var(--surface-raised)" }}
        >
          <LeftTabs tab={leftTab} onChange={setLeftTab} />
          <div className="flex-1 overflow-auto">
            {leftTab === "overview" ? (
              <LeftColumn agent={agent} />
            ) : (
              <AgentArchitecture baseUrl={agent.baseUrl} />
            )}
          </div>
        </aside>
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
            ) : agent.modality === "computer-use" && agent.dashboardUrl ? (
              <ComputerUsePane
                baseUrl={agent.baseUrl}
                prompts={agent.prompts}
                dashboardUrl={agent.dashboardUrl}
                onActive={setActive}
              />
            ) : (
              <ChatPanel
                baseUrl={agent.baseUrl}
                prompts={agent.prompts}
                onActive={setActive}
                showAuthor={agent.modality === "deep-research"}
              />
            )}
          </div>
        </main>
      </div>
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
