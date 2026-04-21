import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { Annotation } from "@/components/diagrams/Annotation";
import { useSlideStore } from "@/state/useSlideStore";

export function RunnerScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        The runner is the loop. You hand it an agent and four
        services. It produces an event stream. That stream is the
        single source of truth for everything you will want to do
        with a conversation after the fact.
      </p>
      <p>
        <code className="text-[var(--accent)]">run_async</code> for
        text and tool calling.{" "}
        <code className="text-[var(--accent)]">run_live</code> for
        bidirectional audio and video. Same runner, same session,
        same event shape.
      </p>
      {level === "advanced" && (
        <p>
          Plugins attach to the runner and see every event in its
          scope — which is why tracing, billing, retries, and
          per-tenant policy live here rather than inside agent code.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="02 · runtime"
      title="The runner is where everything happens."
      lede="Agent on one side. Services on the other. Events coming out."
      left={left}
      right={<RunnerDiagram level={level} />}
    />
  );
}

function RunnerDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Runner column */}
      <Node x={500} y={320} w={240} h={96} kind="service" tone="accent" active
            title="Runner" subtitle="run_async · run_live" kicker="RUNTIME" />

      {/* Agent left */}
      <Node x={180} y={320} kind="agent" title="root_agent" subtitle="LlmAgent" />
      <Edge from={{ x: 244, y: 320 }} to={{ x: 380, y: 320 }} arrow="both" travel />

      {/* Services right */}
      <Node x={820} y={170} w={184} h={60} kind="service" tone="trace" title="SessionService"  kicker="STATE" />
      <Node x={820} y={250} w={184} h={60} kind="service" tone="trace" title="MemoryService"   kicker="RECALL" />
      <Node x={820} y={330} w={184} h={60} kind="service" tone="trace" title="ArtifactService" kicker="BYTES" />
      <Node x={820} y={410} w={184} h={60} kind="service" tone="trace" title="CredentialService" kicker="AUTH" />

      <Edge from={{ x: 620, y: 300 }} to={{ x: 728, y: 170 }} arrow="both" tone="trace" travel travelDuration={1.6} />
      <Edge from={{ x: 620, y: 310 }} to={{ x: 728, y: 250 }} arrow="both" tone="trace" travel travelDuration={1.7} />
      <Edge from={{ x: 620, y: 330 }} to={{ x: 728, y: 330 }} arrow="both" tone="trace" travel travelDuration={1.8} />
      <Edge from={{ x: 620, y: 340 }} to={{ x: 728, y: 410 }} arrow="both" tone="trace" travel travelDuration={1.9} />

      {/* Event stream */}
      <Node x={180} y={520} w={240} kind="io" title="Event stream" subtitle="content · actions · state_delta" kicker="OUT" />
      <Edge from={{ x: 500, y: 378 }} to={{ x: 300, y: 498 }} arrow="forward" travel travelDuration={1.8} />

      {level !== "beginner" && (
        <Annotation
          x={500} y={320} anchor="bottom"
          kicker="DRIVE LOOP"
          text="Model → Tool → Model → … until turn complete."
          delay={0.9}
        />
      )}

      {level === "advanced" && (
        <>
          <Node x={500} y={96} w={360} h={56} kind="service" tone="muted" title="Plugin stack" subtitle="rate-limit · audit · retries · policy · tracing" kicker="RUNNER SCOPE" />
          <Edge from={{ x: 500, y: 124 }} to={{ x: 500, y: 272 }} arrow="forward" tone="muted" delay={1.2} />
        </>
      )}
    </Canvas>
  );
}
