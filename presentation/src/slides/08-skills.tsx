import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { useSlideStore } from "@/state/useSlideStore";
import { spring } from "@/lib/motion";

export function SkillsScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        Skills package agent behaviour into a directory: a{" "}
        <code>SKILL.md</code> front matter + body, optional{" "}
        <code>references/</code>, <code>scripts/</code>, and{" "}
        <code>assets/</code>.
      </p>
      <p>
        Loading is <em>progressive</em>. The model sees L1 metadata
        for every skill. L2 body loads when the skill is relevant.
        L3 references load only when the body refers to them. A
        hundred skills cost a hundred one-line descriptions, not a
        hundred full bodies.
      </p>
      {level === "advanced" && (
        <p>
          The same <code>SkillToolset</code> hosts function tools, MCP
          toolsets, and a code executor — so the model sees skills,
          tools, and scripts as one unified capability surface.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="08 · capability"
      title="The surface area the model sees."
      lede="Skills, tools, MCP, code — one unified capability surface."
      left={left}
      right={<SkillsDiagram level={level} />}
    />
  );
}

function SkillsDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Three layers of disclosure */}
      {[
        { y: 130, kicker: "L1 · metadata",    body: "name + description · ~30 tokens each",       tone: "accent" as const },
        { y: 290, kicker: "L2 · body",        body: "SKILL.md instructions · loaded when relevant", tone: "trace" as const },
        { y: 450, kicker: "L3 · references",  body: "references/ · scripts/ · only on demand",    tone: "muted" as const },
      ].map((row, i) => (
        <motion.g
          key={row.y}
          initial={{ opacity: 0, scaleX: 0.96, transformOrigin: "left center" }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ ...spring, delay: 0.15 + i * 0.15 }}
        >
          <rect x={140} y={row.y - 50} width={720} height={100}
                rx={14}
                fill={row.tone === "accent"
                  ? "color-mix(in oklab, var(--accent) 8%, var(--elev-1))"
                  : row.tone === "trace"
                    ? "color-mix(in oklab, var(--trace) 6%, var(--elev-1))"
                    : "var(--elev-1)"}
                stroke={row.tone === "accent" ? "var(--accent-hairline)"
                     : row.tone === "trace" ? "var(--trace-hairline)"
                     : "var(--border-strong)"}
                strokeWidth={1} />
          <text x={168} y={row.y - 20}
                fontFamily="var(--font-mono)" fontSize="10.5"
                letterSpacing="2.8" fill={row.tone === "accent" ? "var(--accent)" : row.tone === "trace" ? "var(--trace)" : "var(--text-faint)"}
                style={{ textTransform: "uppercase" }}>
            {row.kicker}
          </text>
          <text x={168} y={row.y + 8}
                fontFamily="var(--font-sans)" fontSize="16" fontWeight={500}
                fill="var(--text)">
            {["always in context", "triggered", "consulted"][i]}
          </text>
          <text x={168} y={row.y + 28}
                fontFamily="var(--font-mono)" fontSize="11.5"
                fill="var(--text-subtle)">
            {row.body}
          </text>
        </motion.g>
      ))}

      {level !== "beginner" && (
        <>
          <Node x={930} y={290} w={100} h={360} kind="agent" tone="accent" active
                title="" kicker="" delay={0.8} />
          <text x={930} y={260}
                textAnchor="middle"
                fontFamily="var(--font-mono)" fontSize="9.5"
                letterSpacing="2.4" fill="var(--accent)"
                style={{ textTransform: "uppercase" }}>
            model
          </text>
          <text x={930} y={330}
                textAnchor="middle"
                fontFamily="var(--font-sans)" fontSize="15" fontWeight={500}
                fill="var(--accent)">
            context
          </text>
        </>
      )}
    </Canvas>
  );
}
