import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";
import { spring } from "@/lib/motion";

export function HarnessScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        A harness is what you build when many agents, from many
        teams, run on one platform — and the platform owns auth,
        tenancy, quotas, observability, and deployment.
      </p>
      <p>
        ADK fits this shape without violence. Services are typed
        interfaces: implement your own multi-tenant Postgres session
        service, your per-tenant credentials store, your memory
        backed by whatever vector store you run. Plug them in.
      </p>
      <p>
        Plugins attach to the runner and see every invocation. Rate
        limits, PII redaction, cost metering, per-tenant policy,
        audit — none of them live inside agent code.
      </p>
      {level === "advanced" && (
        <p>
          The payoff: a tenant's agent author writes a normal{" "}
          <code>LlmAgent</code>. The platform wraps it with identity,
          quotas, billing, and audit — and the agent is ready for
          production without a rewrite.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="12 · platform"
      title="The runtime that runs other runtimes."
      lede="A harness is a platform where agents are first-class, everything else slots in."
      left={left}
      right={<HarnessDiagram level={level} />}
    />
  );
}

function HarnessDiagram({ level: _level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Four horizontal layers */}
      {[
        { y: 90,  label: "Surface",  kicker: "chat · voice · ide · cli",                             tone: "muted"  as const },
        { y: 220, label: "Platform", kicker: "auth · tenancy · registry · quotas · policy",          tone: "trace"  as const },
        { y: 350, label: "Runtime",  kicker: "ADK Runner · plugins · callbacks",                    tone: "accent" as const },
        { y: 480, label: "Backends", kicker: "session · memory · artifact · credential · otel · bq", tone: "muted"  as const },
      ].map((row, i) => (
        <motion.g
          key={row.y}
          initial={{ opacity: 0, scaleY: 0.8, transformOrigin: "center" }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ ...spring, delay: 0.1 + i * 0.15 }}
        >
          <rect x={120} y={row.y - 42} width={760} height={84} rx={14}
                fill={row.tone === "accent"
                  ? "color-mix(in oklab, var(--accent) 9%, var(--elev-1))"
                  : row.tone === "trace"
                    ? "color-mix(in oklab, var(--trace) 6%, var(--elev-1))"
                    : "var(--elev-1)"}
                stroke={row.tone === "accent" ? "var(--accent-hairline)"
                     : row.tone === "trace" ? "var(--trace-hairline)"
                     : "var(--border-strong)"}
                strokeWidth={1} />
          <text x={148} y={row.y - 14}
                fontFamily="var(--font-mono)" fontSize="10"
                letterSpacing="2.6"
                fill={row.tone === "accent" ? "var(--accent)"
                     : row.tone === "trace" ? "var(--trace)"
                     : "var(--text-faint)"}
                style={{ textTransform: "uppercase" }}>
            Layer {i + 1}
          </text>
          <text x={148} y={row.y + 8}
                fontFamily="var(--font-sans)" fontSize="17" fontWeight={500}
                fill="var(--text)">
            {row.label}
          </text>
          <text x={148} y={row.y + 28}
                fontFamily="var(--font-mono)" fontSize="12"
                fill="var(--text-subtle)">
            {row.kicker}
          </text>
        </motion.g>
      ))}

      {/* Flow arrows between layers */}
      {[158, 288, 418].map((y, i) => (
        <Edge
          key={y}
          from={{ x: 500, y }}
          to={{ x: 500, y: y + 52 }}
          arrow="both"
          tone={i === 1 ? "accent" : "muted"}
          travel
          travelDuration={1.8}
          delay={0.7 + i * 0.15}
        />
      ))}

      {/* Tenant stamps */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        {["acme", "beta-tenant", "demo-co"].map((t, i) => (
          <g key={t}>
            <rect x={898 + i * 40} y={338} width={28} height={28} rx={6}
                  fill="color-mix(in oklab, var(--accent) 10%, transparent)"
                  stroke="var(--accent-hairline)" />
            <text x={912 + i * 40} y={357}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="9"
                  fill="var(--accent)">
              {t[0]}
            </text>
          </g>
        ))}
      </motion.g>
      <text x={920} y={330} textAnchor="start"
            fontFamily="var(--font-mono)" fontSize="9"
            letterSpacing="2.4" fill="var(--text-faint)"
            style={{ textTransform: "uppercase" }}>
        tenants
      </text>

      <text x={500} y={600} textAnchor="middle"
            fontFamily="var(--font-serif)" fontStyle="italic"
            fontSize="16" fill="var(--text-faint)">
        agents write plain code; the platform wraps the rest
      </text>
    </Canvas>
  );
}
