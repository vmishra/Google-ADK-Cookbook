import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";

export function LoopScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        <code className="text-[var(--accent)]">LoopAgent</code> runs
        one sub-agent over and over until the sub-agent sets{" "}
        <code>event.actions.escalate = True</code>, or{" "}
        <code>max_iterations</code> is hit.
      </p>
      <p>
        The pattern: a drafter-and-critic that reads its own previous
        draft, rewrites if the critic is unhappy, and escalates when
        it is finally clean.
      </p>
      {level === "advanced" && (
        <p>
          Stopping is an explicit signal, not pattern-matching on the
          model's prose. Put a boolean in state; read it in an{" "}
          <code>after_agent_callback</code>; set <code>escalate</code>.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="07 · refinement"
      title="Draft, critique, repeat."
      lede="A bounded loop. Stopping is an explicit signal."
      left={left}
      right={<LoopDiagram level={level} />}
    />
  );
}

function LoopDiagram({ level: _level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Curving loop */}
      <motion.path
        d="M 200 320 C 280 150, 720 150, 800 320 C 720 490, 280 490, 200 320"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={1}
        strokeDasharray="4 6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <Node x={200} y={320} kind="agent" tone="accent" active
            title="drafter+critic" subtitle="gemini-2.5-pro" kicker="ITER N" />

      <Node x={800} y={320} kind="io"
            title="state.draft" subtitle="persisted turn to turn"
            kicker="OUTPUT" delay={0.4} />

      <Edge from={{ x: 298, y: 300 }} to={{ x: 702, y: 300 }}
            arrow="forward" travel label="writes" delay={0.6} />
      <Edge from={{ x: 702, y: 340 }} to={{ x: 298, y: 340 }}
            curve={40} arrow="forward" travel label="reads on next iter" delay={1.4} />

      <Node x={500} y={540} w={260} h={72} kind="service" tone="trace"
            title="LoopAgent" subtitle="max_iterations = 4"
            kicker="BOUND"
            delay={1.6} />

      {/* Escalate signal */}
      <Node x={500} y={120} w={260} h={60} kind="io" tone="accent"
            title="escalate = True" kicker="STOP SIGNAL"
            delay={2.0} />
      <Edge from={{ x: 368, y: 282 }} to={{ x: 430, y: 146 }}
            arrow="forward" delay={2.3} tone="accent" />

      <motion.text
        x={500} y={620} textAnchor="middle"
        fontFamily="var(--font-serif)" fontStyle="italic"
        fontSize="16" fill="var(--text-faint)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
        bounded, observable, explicit
      </motion.text>
    </Canvas>
  );
}
