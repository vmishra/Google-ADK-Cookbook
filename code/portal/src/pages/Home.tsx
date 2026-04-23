import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

import { AGENTS, type AgentMeta } from "@/data/agents";
import { navigate } from "@/lib/router";
import { Topbar } from "@/components/Topbar";
import { AgentTopology } from "@/components/home/AgentTopology";
import { LiveStatus } from "@/components/home/LiveStatus";
import { fadeRise, spring } from "@/lib/motion";

/* ---------------------------------------------------------------------- */

export function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Topbar />
      <main className="flex-1 relative">
        <BackgroundAnchor />
        <div className="relative max-w-[1040px] mx-auto px-8 md:px-12">
          <Lead />
          <Divider />
          <SystemRail />
          <Divider />
          <Index />
          <Divider />
          <Axioms />
          <Divider />
          <RunBlock />
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ---------- subtle warm anchor at top of content ---------- */
function BackgroundAnchor() {
  return (
    <div
      className="absolute inset-x-0 top-0 h-[320px] pointer-events-none"
      style={{
        background:
          "radial-gradient(80% 100% at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%)",
      }}
      aria-hidden
    />
  );
}

/* ---------- lead ---------- */
function Lead() {
  return (
    <section className="pt-16 pb-14">
      <motion.div variants={fadeRise} initial="initial" animate="animate" className="max-w-[720px]">
        <div className="flex items-center gap-3 mb-8">
          <span className="kicker">google adk</span>
          <span className="h-px w-8 bg-[var(--accent-hairline)]" aria-hidden />
          <span className="kicker">reference implementation</span>
          <span className="h-px w-8 bg-[var(--border)]" aria-hidden />
          <span className="kicker">v1.0</span>
        </div>
        <h1
          className="font-[var(--font-serif)] text-[44px] md:text-[56px] leading-[1.05] font-medium tracking-[-0.015em]"
          style={{ color: "var(--text)" }}
        >
          Five production-shaped agents.
          <br />
          <span className="italic text-[var(--text-muted)]">
            One canonical ADK pattern each.
          </span>
        </h1>
        <div className="hairline mt-9 mb-7" style={{ width: 220 }} />
        <p className="text-[15px] leading-[1.65] text-[var(--text-muted)] max-w-[600px]">
          A concierge built as a single <span className="font-[var(--font-mono)]">LlmAgent</span>. A travel planner built as a sequential
          deep-research pipeline. A native-audio voice line. A browser-driving
          support rep. An advisor built as a three-tier hierarchy with
          skills and shared memory. Every agent is a self-contained
          Python project — open, run, compare.
        </p>
      </motion.div>
    </section>
  );
}

/* ---------- system rail ---------- */
function SystemRail() {
  const totalSubs = AGENTS.reduce((n, a) => n + (a.id === "beauty-advisor" ? 12 : a.id === "travel-planner" ? 4 : 0), 0);
  const totalTools = AGENTS.reduce((n, a) => n + (a.toolCount || 0), 0) + 8 /* travel search tools */ + 5 /* payments */ + 4 /* food */ + 10 /* beauty memory+skills */;
  const cells = [
    { label: "agents", value: AGENTS.length.toString().padStart(2, "0") },
    { label: "sub-agents", value: totalSubs.toString().padStart(2, "0") },
    { label: "tools", value: totalTools.toString() },
    { label: "modalities", value: "04" },
    { label: "model tiers", value: "03" },
  ];
  return (
    <section className="py-10 grid grid-cols-2 md:grid-cols-5 gap-y-6">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className="px-4 flex flex-col gap-1"
          style={{
            borderLeft: i === 0 ? undefined : "1px solid var(--border)",
          }}
        >
          <span className="kicker">{c.label}</span>
          <span
            className="text-[36px] font-medium font-[var(--font-mono)] tabular-nums tracking-[-0.02em] leading-[1]"
            data-numeric
          >
            {c.value}
          </span>
        </div>
      ))}
    </section>
  );
}

/* ---------- index ---------- */
function Index() {
  return (
    <section className="py-10">
      <IndexHeader />
      <ol className="mt-4">
        {AGENTS.map((agent, i) => (
          <motion.li
            key={agent.id}
            variants={fadeRise}
            initial="initial"
            animate={{ opacity: 1, y: 0, transition: { ...spring, delay: 0.04 * i } }}
          >
            <AgentRow agent={agent} />
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function IndexHeader() {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex items-center gap-3">
        <span className="kicker">the index</span>
        <span className="h-px w-8 bg-[var(--border)]" aria-hidden />
        <span className="text-[11px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
          basic → advanced
        </span>
      </div>
      <span className="text-[11px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
        open to run
      </span>
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentMeta }) {
  return (
    <button
      onClick={() => navigate(`/a/${agent.id}`)}
      className="group relative w-full text-left block py-6 grid gap-6 items-center"
      style={{
        gridTemplateColumns: "44px 1fr 112px 220px 96px 28px",
        borderTop: "1px solid var(--border)",
      }}
    >
      {/* number */}
      <span className="font-[var(--font-mono)] text-[13px] text-[var(--text-subtle)] tracking-[0.18em] tabular-nums">
        {agent.number}
      </span>

      {/* title + pattern */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-[var(--font-serif)] text-[22px] font-medium tracking-[-0.01em] leading-[1.1] text-[var(--text)]">
            {agent.title}
          </h3>
          <span className="text-[11px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
            {modalityLabel(agent.modality)}
          </span>
        </div>
        <p className="text-[13.5px] leading-[1.55] text-[var(--text-muted)] max-w-[540px]">
          {agent.subtitle}
        </p>
      </div>

      {/* topology glyph */}
      <div className="flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
        <AgentTopology agent={agent} accent />
      </div>

      {/* models — mono stack */}
      <div className="flex flex-col gap-1 font-[var(--font-mono)] text-[11.5px] text-[var(--text-muted)] tabular-nums">
        {agent.models.map((m) => (
          <span key={m} className="truncate" title={m}>{m}</span>
        ))}
      </div>

      {/* port + live status */}
      <div className="flex flex-col items-start gap-1.5">
        <span className="font-[var(--font-mono)] text-[13px] text-[var(--text)] tabular-nums">
          :{new URL(agent.baseUrl).port}
        </span>
        <LiveStatus baseUrl={agent.baseUrl} />
      </div>

      {/* arrow */}
      <ArrowUpRight
        size={16}
        strokeWidth={1.5}
        className="justify-self-end text-[var(--text-faint)] group-hover:text-[var(--accent)] group-hover:-translate-y-[1px] group-hover:translate-x-[1px] transition-all"
      />

      {/* hover underline / accent */}
      <span
        className="absolute inset-x-0 bottom-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "var(--accent-hairline)" }}
        aria-hidden
      />
    </button>
  );
}

/* ---------- axioms ---------- */
function Axioms() {
  const items = [
    {
      n: "i",
      title: "One canonical shape.",
      body:
        "Every agent package exports a module-level " +
        "root_agent. __init__.py re-imports it so adk run . " +
        "and our own server find the same object. Mirrors " +
        "google/adk-samples.",
    },
    {
      n: "ii",
      title: "Tools are bare functions.",
      body:
        "Plain Python functions with typed args and a docstring. " +
        "No FunctionTool wrapper. The docstring is the description " +
        "the model sees; the type hints become the schema.",
    },
    {
      n: "iii",
      title: "State is the contract.",
      body:
        "Sub-agents never call each other. They read and write " +
        "tool_context.state via output_key. That is what makes the " +
        "parallel phases safe and the hierarchy legible.",
    },
    {
      n: "iv",
      title: "Progressive disclosure.",
      body:
        "Skills have short cards the root can see and long playbooks " +
        "unlocked on demand. The root's context stays tight; domain " +
        "logic lives where the work happens.",
    },
  ];
  return (
    <section className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <span className="kicker">what's canonical</span>
        <span className="h-px w-8 bg-[var(--border)]" aria-hidden />
        <span className="text-[11px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)]">
          four axioms
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-y-8 gap-x-12">
        {items.map((it) => (
          <div key={it.n} className="flex gap-4">
            <span className="font-[var(--font-serif)] italic text-[var(--text-subtle)] text-[18px] leading-none pt-[4px] w-7 shrink-0">
              {it.n}.
            </span>
            <div>
              <h4 className="font-[var(--font-serif)] text-[18px] leading-[1.25] mb-1.5 tracking-[-0.005em]">
                {it.title}
              </h4>
              <p className="text-[13.5px] leading-[1.6] text-[var(--text-muted)] max-w-[420px]">
                {it.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- run block ---------- */
function RunBlock() {
  return (
    <section className="py-12">
      <div className="grid md:grid-cols-[1fr_auto] gap-12 items-start">
        <div>
          <span className="kicker mb-4 block">to run</span>
          <h3 className="font-[var(--font-serif)] text-[28px] leading-[1.15] tracking-[-0.01em] mb-4 text-[var(--text)]">
            Five servers, one portal, one command.
          </h3>
          <p className="text-[14px] leading-[1.6] text-[var(--text-muted)] max-w-[480px] mb-5">
            Each agent has its own virtualenv, its own .env, and its own
            FastAPI entry. You can open just one folder in your IDE and
            run it — or bring up the whole stack from the repo root.
          </p>
          <pre
            className="font-[var(--font-mono)] text-[13px] text-[var(--text)] bg-[var(--elev-1)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 shadow-[var(--shadow-1)]"
            style={{ maxWidth: 420 }}
          >
            <span className="text-[var(--text-subtle)]">$</span>{" "}
            ./scripts/up.sh
          </pre>
        </div>
        <div className="min-w-[260px]">
          <span className="kicker mb-3 block">ports</span>
          <div className="font-[var(--font-mono)] text-[12.5px] tabular-nums">
            {[
              ["portal", 5174],
              ["concierge", 8001],
              ["travel planner", 8002],
              ["payments voice", 8003],
              ["food delivery", 8004],
              ["beauty advisor", 8005],
            ].map(([n, p]) => (
              <div
                key={String(n)}
                className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-b-0"
              >
                <span className="text-[var(--text-muted)]">{n}</span>
                <span className="text-[var(--text)]">:{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */
function Footer() {
  return (
    <footer
      className="border-t"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="max-w-[1040px] mx-auto px-8 md:px-12 py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[12px] text-[var(--text-subtle)]">
        <div className="flex items-center gap-3">
          <span className="font-[var(--font-serif)] italic text-[var(--text-muted)]">adk</span>
          <span className="h-3 w-px bg-[var(--border)]" aria-hidden />
          <span className="kicker">google agent development kit</span>
        </div>
        <span className="font-[var(--font-mono)] text-[11px] tracking-[0.08em]">
          python 3.12 · google-adk ≥ 1.18 · gemini 3.1 flash family
        </span>
      </div>
    </footer>
  );
}

/* ---------- helpers ---------- */
function Divider() {
  return <div className="h-px w-full bg-[var(--border)]" aria-hidden />;
}

function modalityLabel(m: AgentMeta["modality"]): string {
  return (
    {
      text: "text",
      voice: "voice",
      "computer-use": "computer-use",
      "deep-research": "deep-research",
      eval: "eval",
      video: "video",
    } as const
  )[m];
}
