import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";

export function A2AScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        Agent-to-Agent is an open protocol —{" "}
        <code>a2a-protocol.org</code>. An agent publishes a card at a
        well-known URL; any client reads the card and calls the
        agent.
      </p>
      <p>
        In ADK: <code>RemoteA2aAgent(agent_card=url)</code> consumes
        a remote agent as if it were local.{" "}
        <code>adk api_server --a2a</code> exposes yours. Cross-framework,
        cross-process, cross-org.
      </p>
      {level === "advanced" && (
        <p>
          The unlock: agent fleets. A root coordinator that routes
          between remote agents owned by different teams, each
          running on its own stack, all federated under one user
          identity. Discovery via an agent registry.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="11 · federation"
      title="Agents across processes, teams."
      lede="An open protocol. Any framework can speak it."
      left={left}
      right={<A2ADiagram level={level} />}
    />
  );
}

function A2ADiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Root agent */}
      <Node x={500} y={140} kind="agent" tone="accent" active
            title="root coordinator" subtitle="ADK · gemini-2.5-pro" kicker="LOCAL" />

      {/* Three remote agents on three stacks */}
      <Node x={180} y={420} w={220} h={78} kind="agent" tone="trace"
            title="sre_agent"       subtitle="ADK · team A"       kicker="REMOTE A2A" delay={0.3} />
      <Node x={500} y={420} w={220} h={78} kind="agent" tone="trace"
            title="pricing_agent"   subtitle="LangGraph · team B" kicker="REMOTE A2A" delay={0.45} />
      <Node x={820} y={420} w={220} h={78} kind="agent" tone="trace"
            title="research_agent"  subtitle="CrewAI · team C"    kicker="REMOTE A2A" delay={0.6} />

      <Edge from={{ x: 440, y: 180 }} to={{ x: 218, y: 380 }} arrow="both" travel travelDuration={1.7} delay={0.7} />
      <Edge from={{ x: 500, y: 182 }} to={{ x: 500, y: 380 }} arrow="both" travel travelDuration={1.8} delay={0.85} />
      <Edge from={{ x: 560, y: 180 }} to={{ x: 782, y: 380 }} arrow="both" travel travelDuration={1.9} delay={1.0} />

      {/* Agent cards */}
      {[180, 500, 820].map((x, i) => (
        <motion.g
          key={x}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 + i * 0.12, duration: 0.5 }}
        >
          <rect x={x - 88} y={530} width={176} height={60} rx={10}
                fill="var(--elev-1)" stroke="var(--border-strong)" />
          <text x={x - 74} y={554} fontFamily="var(--font-mono)" fontSize="9"
                letterSpacing="2.2" fill="var(--text-faint)"
                style={{ textTransform: "uppercase" }}>
            .well-known/agent-card
          </text>
          <text x={x - 74} y={572} fontFamily="var(--font-mono)" fontSize="11"
                fill="var(--text-muted)">
            {["sre.internal", "pricing.svc", "research.io"][i]}/a2a
          </text>
        </motion.g>
      ))}

      {level !== "beginner" && (
        <text x={500} y={620} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="10.5"
              letterSpacing="2.8" fill="var(--text-faint)"
              style={{ textTransform: "uppercase" }}>
          open protocol · framework-agnostic · same contract
        </text>
      )}
    </Canvas>
  );
}
