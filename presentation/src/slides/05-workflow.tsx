import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { CodeCard } from "@/components/diagrams/CodeCard";
import { useSlideStore } from "@/state/useSlideStore";

export function WorkflowScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        <code className="text-[var(--accent)]">SequentialAgent</code>,{" "}
        <code className="text-[var(--accent)]">ParallelAgent</code>,{" "}
        <code className="text-[var(--accent)]">LoopAgent</code>,{" "}
        <code className="text-[var(--accent)]">LlmAgent</code> —
        every one implements <code>BaseAgent</code>. Which means they
        nest.
      </p>
      <p>
        Here, a planner on Pro produces state['plan']. A researcher
        on Flash reads it, fills state['notes']. A writer on Pro
        reads both and answers. Three steps, three models, one tree.
      </p>
      {level === "advanced" && (
        <p>
          Models get picked per step — Pro for reasoning, Flash for
          bulk retrieval. The cost lever that delivers the most
          consistently on real workloads.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="05 · workflow"
      title="Agents compose through one interface."
      lede="Planner, researcher, writer — nested without ceremony."
      left={left}
      right={<WorkflowDiagram level={level} />}
    />
  );
}

function WorkflowDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <div className="relative w-full h-full">
      <Canvas>
        <Node x={200} y={180} kind="agent" tone="accent" active
              title="planner" subtitle="gemini-2.5-pro" kicker="STEP 1" />
        <Node x={500} y={180} kind="agent" tone="accent"
              title="researcher" subtitle="gemini-2.5-flash · google_search" kicker="STEP 2" />
        <Node x={800} y={180} kind="agent" tone="accent"
              title="writer" subtitle="gemini-2.5-pro" kicker="STEP 3" />

        <Edge from={{ x: 300, y: 180 }} to={{ x: 400, y: 180 }}
              arrow="forward" travel label="state.plan" delay={0.4} />
        <Edge from={{ x: 600, y: 180 }} to={{ x: 700, y: 180 }}
              arrow="forward" travel label="state.notes" delay={1.2} />

        {/* Session state bar */}
        <Node x={500} y={400} w={700} h={84} kind="service" tone="trace"
              title="session state"
              subtitle="plan · notes · answer (output_key)"
              kicker="SHARED"
              delay={1.7} />

        <Edge from={{ x: 200, y: 220 }} to={{ x: 200, y: 360 }} curve={0} tone="trace" arrow="forward" label="writes" delay={0.5} />
        <Edge from={{ x: 500, y: 220 }} to={{ x: 500, y: 360 }} curve={0} tone="trace" arrow="both"    delay={1.0} />
        <Edge from={{ x: 800, y: 220 }} to={{ x: 800, y: 360 }} curve={0} tone="trace" arrow="back"    label="reads"  delay={1.5} />

        <Node x={500} y={540} w={340} h={60} kind="io" tone="muted"
              title="SequentialAgent(sub_agents=[…])"
              kicker="ORCHESTRATOR" delay={2.2} />
      </Canvas>

      {level === "advanced" && (
        <div className="absolute top-6 right-6">
          <CodeCard title="pipeline.py" delay={2.4}>
{`pipeline = SequentialAgent(
  name="deep_answer",
  sub_agents=[
    planner,
    researcher,
    writer,
  ],
)`}
          </CodeCard>
        </div>
      )}
    </div>
  );
}
