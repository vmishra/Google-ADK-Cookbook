import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";

export function MultimodalScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        The live API is bidirectional: audio (and video) up, audio
        (and transcripts) down, all on one stream. Interruption is
        native — start talking and the agent stops mid-sentence.
      </p>
      <p>
        The agent definition does not change. Swap the model to{" "}
        <code>gemini-live-2.5-flash-native-audio</code>. Use{" "}
        <code>runner.run_live(queue, run_config)</code>. Same tools,
        same session, same event shape.
      </p>
      {level === "advanced" && (
        <p>
          <code>SessionResumptionConfig</code> reattaches a dropped
          WebSocket to the same session.{" "}
          <code>ContextWindowCompressionConfig</code> summarises old
          turns before the window fills. Tool calls mid-utterance are
          streamed back in without breaking the audio line.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="09 · live"
      title="Voice is the same agent."
      lede="Bidi audio. Native interruption. The agent body does not change."
      left={left}
      right={<MultimodalDiagram level={level} />}
    />
  );
}

function MultimodalDiagram({ level: _level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* User */}
      <Node x={160} y={320} kind="user" title="mic · camera" subtitle="PCM 16kHz · frames" />

      {/* Middle — queue + runner + agent */}
      <Node x={420} y={230} w={200} h={58} kind="io" tone="trace"
            title="LiveRequestQueue" kicker="UP" delay={0.2} />
      <Node x={420} y={410} w={200} h={58} kind="io" tone="trace"
            title="Event stream" kicker="DOWN" delay={0.2} />

      <Node x={700} y={320} kind="agent" tone="accent" active
            title="voice_agent"
            subtitle="gemini-live-2.5-flash-native-audio"
            delay={0.3} />

      {/* Speaker */}
      <Node x={940} y={320} kind="io" title="speaker" subtitle="audio + transcript" delay={0.4} />

      {/* Up flow */}
      <Edge from={{ x: 220, y: 320 }} to={{ x: 320, y: 250 }} arrow="forward" travel travelDuration={1.3} delay={0.5} />
      <Edge from={{ x: 520, y: 230 }} to={{ x: 624, y: 300 }} arrow="forward" tone="trace" travel travelDuration={1.5} delay={0.7} />

      {/* Down flow */}
      <Edge from={{ x: 624, y: 340 }} to={{ x: 520, y: 410 }} arrow="forward" tone="trace" travel travelDuration={1.5} delay={1.2} />
      <Edge from={{ x: 320, y: 410 }} to={{ x: 220, y: 350 }} arrow="forward" travel travelDuration={1.3} delay={1.4} />
      <Edge from={{ x: 776, y: 320 }} to={{ x: 872, y: 320 }} arrow="forward" travel travelDuration={1.3} delay={1.6} />

      {/* Interruption indicator */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.2, delay: 2.0, repeat: Infinity, repeatDelay: 1.4 }}
      >
        <text x={500} y={558} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="10.5"
              letterSpacing="2.6" fill="var(--accent)"
              style={{ textTransform: "uppercase" }}>
          user speaks → agent stops → turn.interrupted = true
        </text>
      </motion.g>
    </Canvas>
  );
}
