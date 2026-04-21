import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";

export function ComputerUseScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        <code>gemini-2.5-computer-use</code> is trained to operate a
        browser. Screenshot in, action out. No DOM selectors; the
        model reasons about pixels.
      </p>
      <p>
        ADK wires it through a <code>ComputerUseToolset</code> with
        a <code>BaseComputer</code> implementation — Playwright is
        the reference. Click, type, scroll, navigate. Next screenshot
        comes back on the next turn.
      </p>
      {level === "advanced" && (
        <p>
          Production layers: domain allowlist in{" "}
          <code>before_tool_callback</code>, destructive-click gate
          reading OCR'd target text, approval via{" "}
          <code>LongRunningFunctionTool</code>, and a containerised
          browser per session for sandbox isolation.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="10 · computer use"
      title="The model sees pixels. Acts."
      lede="Screenshot in. Action out. A real browser, operated."
      left={left}
      right={<ComputerUseDiagram level={level} />}
    />
  );
}

function ComputerUseDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Screenshot mock */}
      <motion.g
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <rect x={80} y={90} width={340} height={460} rx={12}
              fill="var(--elev-2)" stroke="var(--border-strong)" strokeWidth={1} />
        <rect x={80} y={90} width={340} height={28} rx={12}
              fill="var(--surface-raised)" stroke="var(--border-strong)" strokeWidth={1} />
        <circle cx={100} cy={104} r={4} fill="var(--danger)" opacity={0.6} />
        <circle cx={114} cy={104} r={4} fill="var(--accent)" opacity={0.6} />
        <circle cx={128} cy={104} r={4} fill="var(--success)" opacity={0.6} />
        <rect x={156} y={98} width={240} height={14} rx={7}
              fill="var(--elev-1)" stroke="var(--border)" />
        <text x={168} y={108} fontFamily="var(--font-mono)" fontSize="8.5"
              fill="var(--text-subtle)">news.ycombinator.com</text>

        {/* Fake content lines */}
        {[0,1,2,3,4,5,6,7].map((i) => (
          <g key={i}>
            <rect x={102} y={150 + i * 44} width={14} height={14} rx={3}
                  fill="var(--elev-1)" stroke="var(--border)" />
            <rect x={126} y={152 + i * 44} width={250 - i * 14} height={10} rx={3}
                  fill="var(--elev-1)" stroke="var(--border)" />
            <rect x={126} y={166 + i * 44} width={120} height={6} rx={3}
                  fill="var(--elev-1)" opacity={0.5} />
          </g>
        ))}

        {/* Cursor */}
        <motion.g
          initial={{ x: 0, y: 0 }}
          animate={{ x: [0, 160, 160, 180], y: [0, 40, 40, 80] }}
          transition={{ duration: 4.4, delay: 1.0, times: [0, 0.4, 0.7, 1], repeat: Infinity, repeatDelay: 1 }}
        >
          <circle cx={200} cy={200} r={10} fill="var(--accent)" opacity={0.2} />
          <circle cx={200} cy={200} r={4} fill="var(--accent)" />
        </motion.g>
      </motion.g>

      {/* Model */}
      <Node x={700} y={180} kind="model" tone="accent" active
            title="gemini-2.5-computer-use" subtitle="pixels · action planner"
            delay={0.6} />

      {/* Tool */}
      <Node x={700} y={420} w={220} h={72} kind="tool" tone="trace"
            title="PlaywrightComputer" subtitle="click · type · scroll · navigate"
            kicker="BASE COMPUTER" delay={0.8} />

      <Edge from={{ x: 420, y: 220 }} to={{ x: 602, y: 180 }} arrow="forward" label="screenshot" travel delay={1.0} />
      <Edge from={{ x: 700, y: 232 }} to={{ x: 700, y: 386 }} arrow="forward" tone="trace" label="action" travel delay={1.6} />
      <Edge from={{ x: 590, y: 420 }} to={{ x: 420, y: 320 }} arrow="forward" tone="trace" travel label="new pixels" delay={2.6} />

      {level === "advanced" && (
        <Node x={860} y={560} w={240} h={52} kind="service" tone="muted"
              title="domain allowlist · approval gate" kicker="BEFORE_TOOL"
              delay={1.8} />
      )}
    </Canvas>
  );
}
