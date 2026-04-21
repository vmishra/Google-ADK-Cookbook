import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";

export function ClosingScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p className="font-serif italic text-[17px] leading-[1.55] text-[var(--text)]">
        Everything before this page, composed into one running
        system.
      </p>
      <p>
        A user speaks. The runner opens a live session. A coordinator
        routes to a specialist. The specialist delegates a sub-task
        over A2A. Tools run. State is written. Memory remembers.
        Events stream out the whole time, audited and billed.
      </p>
      <p>
        Press <kbd className="font-mono text-[11px] bg-[var(--elev-1)] border border-[var(--border)] rounded px-1.5 py-0.5">V</kbd>{" "}
        to watch it happen. Or start again from the top.
      </p>
      {level === "advanced" && (
        <p>
          Nothing in the scene below was simulated. Every primitive
          rendered is a real class in{" "}
          <code>github.com/google/adk-python</code>, current as of
          1.31.1.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="13 · epilogue"
      title="Everything you just saw, at once."
      lede="A composed system, from message to response."
      left={left}
      right={<ClosingDiagram />}
    />
  );
}

function ClosingDiagram() {
  return (
    <Canvas>
      {/* User */}
      <Node x={100} y={320} w={110} h={60} kind="user" title="user" delay={0.0} />

      {/* Runner */}
      <Node x={280} y={320} w={150} h={78} kind="service" tone="accent" active
            title="Runner" subtitle="run_live" delay={0.1} />

      {/* Coordinator */}
      <Node x={480} y={220} kind="agent" tone="accent"
            title="coordinator" subtitle="LlmAgent" delay={0.2} />

      {/* Specialist */}
      <Node x={720} y={120} kind="agent" tone="trace"
            title="specialist" subtitle="sub_agents" delay={0.3} />

      {/* Remote */}
      <Node x={720} y={320} kind="agent" tone="trace"
            title="RemoteA2aAgent" subtitle="a2a-protocol.org" delay={0.4} />

      {/* Tool */}
      <Node x={960} y={220} w={120} h={60} kind="tool" tone="trace" title="MCP tool" delay={0.5} />

      {/* Memory + session backend */}
      <Node x={480} y={460} w={160} h={60} kind="service"
            title="Memory Bank" subtitle="vertex" delay={0.6} />
      <Node x={720} y={460} w={160} h={60} kind="service"
            title="Sessions" subtitle="vertex" delay={0.65} />
      <Node x={960} y={460} w={110} h={60} kind="io"
            title="events" subtitle="otel · bq" delay={0.7} />

      {/* Flow */}
      <Edge from={{ x: 156, y: 320 }} to={{ x: 204, y: 320 }} arrow="forward" travel delay={0.8} />
      <Edge from={{ x: 354, y: 300 }} to={{ x: 400, y: 240 }} arrow="forward" travel delay={1.0} />
      <Edge from={{ x: 560, y: 200 }} to={{ x: 640, y: 140 }} arrow="forward" travel delay={1.2} />
      <Edge from={{ x: 800, y: 140 }} to={{ x: 900, y: 200 }} arrow="both"    tone="trace" travel delay={1.4} />
      <Edge from={{ x: 560, y: 240 }} to={{ x: 640, y: 320 }} arrow="forward" travel delay={1.5} />
      <Edge from={{ x: 480, y: 260 }} to={{ x: 480, y: 424 }} arrow="both" tone="trace" travel delay={1.6} />
      <Edge from={{ x: 720, y: 360 }} to={{ x: 720, y: 424 }} arrow="both" tone="trace" travel delay={1.7} />
      <Edge from={{ x: 354, y: 340 }} to={{ x: 900, y: 460 }} curve={60}  tone="muted" arrow="forward" travel travelDuration={2.2} delay={1.8} />

      {/* Return */}
      <Edge from={{ x: 400, y: 360 }} to={{ x: 204, y: 340 }} curve={20} arrow="forward" travel label="reply" delay={2.6} />
      <Edge from={{ x: 204, y: 340 }} to={{ x: 156, y: 340 }} arrow="forward" travel delay={3.0} />

      <motion.text
        x={500} y={600} textAnchor="middle"
        fontFamily="var(--font-serif)" fontStyle="italic"
        fontSize="18" fill="var(--text)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2, duration: 1 }}
      >
        one request, one session, one event log
      </motion.text>
    </Canvas>
  );
}
