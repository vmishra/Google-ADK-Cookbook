import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { AGENTS, type AgentMeta } from "@/data/agents";
import { navigate } from "@/lib/router";
import { Topbar } from "@/components/Topbar";
import { Chip } from "@/components/primitives/Chip";
import { fadeRise, spring } from "@/lib/motion";

export function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <Overture />
      <main className="flex-1 px-6 md:px-12 pb-24 max-w-[1240px] w-full mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <span className="kicker">five agents · runnable locally</span>
          <span className="text-[11px] tracking-[0.18em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
            open one · or run them all
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
          {AGENTS.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} delay={i * 0.05} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Overture() {
  return (
    <section className="px-6 md:px-12 pt-14 pb-16 max-w-[1240px] w-full mx-auto">
      <motion.div
        variants={fadeRise}
        initial="initial"
        animate="animate"
        className="max-w-[720px]"
      >
        <div className="kicker mb-5">google adk · in practice</div>
        <h1 className="font-[var(--font-serif)] text-[58px] md:text-[76px] leading-[1.02] font-medium tracking-[-0.015em]">
          Five agents, one afternoon.
        </h1>
        <motion.div
          className="hairline mt-8 mb-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          style={{ width: 280, transformOrigin: "left" }}
        />
        <p className="font-[var(--font-serif)] italic text-[17px] text-[var(--text-muted)] leading-[1.55] max-w-[580px]">
          A concierge, a travel planner, a voice support line, a browser-driving
          support rep, and a beauty advisor built as a hierarchy — each one
          a self-contained ADK project you can open in an IDE and run.
        </p>
        <div className="flex items-center gap-2 mt-7 text-[10.5px] tracking-[0.28em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
          <span>basic</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>multi-agent</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>voice</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>computer-use</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span>hierarchy</span>
        </div>
      </motion.div>
    </section>
  );
}

function AgentCard({ agent, delay }: { agent: AgentMeta; delay: number }) {
  return (
    <motion.button
      onClick={() => navigate(`/a/${agent.id}`)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { ...spring, delay } }}
      whileHover={{ y: -2 }}
      className="group relative text-left rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--elev-1)] p-5 shadow-[var(--shadow-1)] overflow-hidden"
      style={{ transition: "border-color 180ms ease" }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-[var(--font-mono)] text-[var(--text-subtle)] text-[11px] tracking-[0.18em]">
            {agent.number}
          </span>
          <div>
            <h3 className="text-[20px] font-semibold tracking-[-0.01em]">
              {agent.title}
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
              {agent.subtitle}
            </p>
          </div>
        </div>
        <ArrowUpRight
          size={18}
          strokeWidth={1.5}
          className="text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-colors"
        />
      </div>
      <p className="text-[14px] text-[var(--text-muted)] leading-[1.55] max-w-[540px] mb-5">
        {agent.summary}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="accent">{modalityLabel(agent.modality)}</Chip>
        <Chip tone="neutral">{agent.pattern}</Chip>
        {agent.models.slice(0, 2).map((m) => (
          <Chip key={m} tone="trace">
            <span className="font-[var(--font-mono)]">{m}</span>
          </Chip>
        ))}
        <Chip tone="neutral">{difficultyLabel(agent.difficulty)}</Chip>
      </div>
      <span
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          boxShadow: "inset 0 0 0 1px var(--accent-hairline)",
          borderRadius: "var(--radius-lg)",
        }}
      />
    </motion.button>
  );
}

function modalityLabel(m: AgentMeta["modality"]): string {
  return {
    text: "text chat",
    voice: "voice · native audio",
    "computer-use": "computer use",
    "deep-research": "deep research",
  }[m];
}

function difficultyLabel(d: AgentMeta["difficulty"]): string {
  return { basic: "basic", intermediate: "intermediate", advanced: "advanced" }[d];
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] px-6 md:px-12 py-8 max-w-[1240px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[12px] text-[var(--text-subtle)]">
        <div className="flex items-center gap-3">
          <span className="kicker">workshop bundle</span>
          <span>·</span>
          <span>run locally, no cloud required</span>
        </div>
        <div className="flex items-center gap-3 font-[var(--font-mono)] text-[11px] tracking-[0.08em]">
          <span>concierge :8001</span>
          <span>·</span>
          <span>travel :8002</span>
          <span>·</span>
          <span>payments :8003</span>
          <span>·</span>
          <span>food :8004</span>
          <span>·</span>
          <span>beauty :8005</span>
        </div>
      </div>
    </footer>
  );
}
