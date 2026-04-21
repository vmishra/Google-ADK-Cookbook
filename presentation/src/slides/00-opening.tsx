import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { Annotation } from "@/components/diagrams/Annotation";
import { useSlideStore } from "@/state/useSlideStore";

export function OpeningScene() {
  const { level } = useSlideStore();

  const left =
    level === "beginner" ? (
      <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
        <p>
          ADK is the framework Google uses to build the agents it
          ships itself — Gemini Enterprise, the computer-use preview,
          agents embedded in Workspace. What you see here is that
          framework, rendered as motion.
        </p>
        <p>
          The primitive is <b className="text-[var(--text)]">the agent</b>,
          not the chain. Agents compose. Services slot in. Events flow
          through every turn, and everything a human would want to
          observe is a read over that event log.
        </p>
        <p className="font-serif italic text-[var(--text)]">
          Everything after this page is one of those ideas, taken
          apart.
        </p>
      </div>
    ) : level === "intermediate" ? (
      <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
        <p>
          An ADK program is a tree of <code>BaseAgent</code>s, a set
          of services the runner drives them through, and an event
          stream that is the ground truth for everything else —
          tracing, evaluation, replay, rewind.
        </p>
        <p>
          Ten primitives cover the surface: Agent, Tool, Runner,
          Session, Memory, Artifact, Event, Callback, Plugin, Skill.
          The rest of this piece walks through each, in the order
          you encounter them in production.
        </p>
      </div>
    ) : (
      <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
        <p>
          ADK's wager: <b className="text-[var(--text)]">agents are the
          unit you govern</b>, not nodes in a graph. Every orchestration
          primitive (Sequential, Parallel, Loop, RemoteA2a) is a
          BaseAgent. Every service (Session, Memory, Artifact,
          Credential) is a pluggable interface. Plugins at the runner
          scope compose cross-cutting policy without touching agent code.
        </p>
        <p>
          Once you accept that framing, harness work becomes
          composition over boxes you already trust: swap a service,
          slot in a plugin, stamp a tenant onto the invocation
          context, federate out over A2A. No rewrites.
        </p>
      </div>
    );

  return (
    <Slide
      kicker="00 · prologue"
      title="What is ADK, precisely."
      lede="A living diagram of the framework Google uses to build its own agents."
      left={left}
      right={<OpeningDiagram level={level} />}
    />
  );
}

function OpeningDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Center — the agent */}
      <Node x={500} y={320} kind="agent" tone="accent" active
            title="LlmAgent" subtitle="gemini-2.5-flash" kicker="CORE" />

      {/* Four petals */}
      <Node x={500} y={130} kind="user" title="User"        subtitle="text · voice · vision" />
      <Node x={820} y={320} kind="tool" title="Tools"       subtitle="fn · mcp · openapi · agent" />
      <Node x={500} y={510} kind="service" tone="trace" title="Services" subtitle="session · memory · artifact" />
      <Node x={180} y={320} kind="model" title="Model"      subtitle="gemini · claude · ollama" />

      <Edge from={{ x: 500, y: 168 }} to={{ x: 500, y: 280 }} arrow="forward" travel travelDuration={1.7} />
      <Edge from={{ x: 598, y: 320 }} to={{ x: 722, y: 320 }} arrow="both"    travel travelDuration={1.9} />
      <Edge from={{ x: 500, y: 360 }} to={{ x: 500, y: 472 }} arrow="both"    tone="trace" travel travelDuration={2.1} />
      <Edge from={{ x: 402, y: 320 }} to={{ x: 278, y: 320 }} arrow="both"    travel travelDuration={1.5} />

      {level !== "beginner" && (
        <>
          <Annotation x={500} y={130} anchor="top"    kicker="IN"  text="Any modality — the agent body does not change." delay={0.9} />
          <Annotation x={820} y={320} anchor="right"  kicker="OUT" text="Function, OpenAPI, MCP, another agent, long-running." delay={1.05} />
          <Annotation x={500} y={510} anchor="bottom" kicker="STATE" text="Session, memory, artifacts. Pluggable interfaces." delay={1.2} />
          <Annotation x={180} y={320} anchor="left"   kicker="LLM"  text="Gemini native. LiteLlm for anything else." delay={1.35} />
        </>
      )}

      {level === "advanced" && (
        <>
          <Node x={80}  y={140} h={52} w={120} kind="service" tone="muted" title="Plugin" kicker="RUNNER" />
          <Node x={920} y={140} h={52} w={120} kind="service" tone="muted" title="Plugin" kicker="RUNNER" />
          <Node x={80}  y={500} h={52} w={120} kind="service" tone="muted" title="Plugin" kicker="RUNNER" />
          <Node x={920} y={500} h={52} w={120} kind="service" tone="muted" title="Plugin" kicker="RUNNER" />
          <Edge from={{ x: 140, y: 166 }} to={{ x: 400, y: 280 }} tone="muted" arrow="forward" delay={1.5} />
          <Edge from={{ x: 860, y: 166 }} to={{ x: 600, y: 280 }} tone="muted" arrow="forward" delay={1.6} />
          <Edge from={{ x: 140, y: 474 }} to={{ x: 400, y: 360 }} tone="muted" arrow="forward" delay={1.7} />
          <Edge from={{ x: 860, y: 474 }} to={{ x: 600, y: 360 }} tone="muted" arrow="forward" delay={1.8} />
        </>
      )}

      {/* Title watermark */}
      <motion.text
        x={500}
        y={600}
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontStyle="italic"
        fontSize="20"
        fill="var(--text-faint)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
      >
        {level === "beginner"
          ? "the framework, at rest"
          : level === "intermediate"
            ? "ten primitives, one lattice"
            : "the runner is a platform"}
      </motion.text>
    </Canvas>
  );
}
