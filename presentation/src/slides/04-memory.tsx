import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { Annotation } from "@/components/diagrams/Annotation";
import { useSlideStore } from "@/state/useSlideStore";

export function MemoryScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        Session tells you what this conversation contained. Memory
        tells you what you learned about the user across every
        conversation before.
      </p>
      <p>
        Vertex Memory Bank does not persist every turn. An extraction
        model decides what is worth keeping and reconciles it with
        existing memories — preferences, decisions, relationships.
        What comes back is notes, not transcripts.
      </p>
      {level === "advanced" && (
        <p>
          Two retrieval modes: <code>preload_memory_tool</code>{" "}
          injects at turn start (higher per-turn cost, always
          relevant); <code>load_memory_tool</code> is on-demand (lower
          cost, model has to know to check). Pick based on how
          memory-dependent the agent is.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="04 · memory"
      title="Memory is not history."
      lede="An LLM decides what to remember, and reconciles it with what it already knew."
      left={left}
      right={<MemoryDiagram level={level} />}
    />
  );
}

function MemoryDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Three sessions over time */}
      {[
        { x: 150, label: "session A",  sub: '"I cycle weekends"',            delay: 0.1 },
        { x: 400, label: "session B",  sub: '"prefer dark mode"',           delay: 0.25 },
        { x: 650, label: "session C",  sub: '"veg. dinner ideas?"',         delay: 0.4 },
      ].map((s) => (
        <Node
          key={s.x}
          x={s.x} y={180} w={200} h={76}
          kind="io" tone="muted"
          title={s.label}
          subtitle={s.sub}
          kicker="SESSION"
          delay={s.delay}
        />
      ))}

      {/* Extraction model */}
      <Node x={400} y={360} w={220} h={72} kind="model" tone="accent" active
            title="Extraction model" subtitle="summarise · dedupe · reconcile" kicker="LLM"
            delay={0.6} />

      <Edge from={{ x: 150, y: 220 }} to={{ x: 400, y: 324 }} tone="trace" arrow="forward" travel delay={0.8} />
      <Edge from={{ x: 400, y: 220 }} to={{ x: 400, y: 324 }} tone="trace" arrow="forward" travel delay={0.95} />
      <Edge from={{ x: 650, y: 220 }} to={{ x: 400, y: 324 }} tone="trace" arrow="forward" travel delay={1.1} />

      {/* Memory store */}
      <Node x={400} y={520} w={300} h={86} kind="service" tone="accent"
            title="Memory bank" subtitle="vertex-ai · semantic · per-user"
            kicker="STORE" delay={1.2} />

      <Edge from={{ x: 400, y: 396 }} to={{ x: 400, y: 478 }} arrow="forward" travel delay={1.4} />

      {/* Consumer side */}
      <Node x={870} y={360} kind="agent" tone="accent" active
            title="Next session" subtitle="preload_memory_tool" kicker="RECALL"
            delay={1.6} />
      <Edge from={{ x: 510, y: 360 }} to={{ x: 776, y: 360 }} curve={60} arrow="forward" travel label="recall" delay={1.8} />

      {level !== "beginner" && (
        <Annotation
          x={400} y={360} anchor="left"
          kicker="EXTRACT"
          text="Writes structured notes, not transcripts."
          delay={1.3}
        />
      )}

      {level === "advanced" && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
        >
          <text x={500} y={620} textAnchor="middle"
                fontFamily="var(--font-mono)" fontSize="11"
                letterSpacing="2.2" fill="var(--text-faint)"
                style={{ textTransform: "uppercase" }}>
            add_session_to_memory · search_memory · load_memory_tool
          </text>
        </motion.g>
      )}
    </Canvas>
  );
}
