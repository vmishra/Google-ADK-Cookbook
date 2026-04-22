import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";

export function ParallelScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        Three researchers, launched concurrently, each writing to a
        different <code>output_key</code>. A reviewer agent reads
        all three and produces the single answer.
      </p>
      <p>
        Fan-out + reduce without a message bus. The session is the
        message bus.
      </p>
      {level !== "beginner" && (
        <p>
          Never have two parallel agents write to the same key —
          last-writer-wins, and which writer was last is not
          deterministic. Always separate keys; merge in the reviewer.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="06 · fan-out"
      title="Three researchers, one answer."
      lede="Independent work in parallel. Session state is the bus."
      left={left}
      right={<ParallelDiagram level={level} />}
    />
  );
}

function ParallelDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  const fanY = [130, 290, 450];
  const labels = [
    { title: "web_researcher",   sub: "google_search",         key: "web_notes"    },
    { title: "kb_researcher",    sub: "vertex rag",            key: "kb_notes"     },
    { title: "sql_researcher",   sub: "bigquery",              key: "sql_notes"    },
  ];

  return (
    <Canvas>
      <Node x={130} y={290} w={160} h={80} kind="io" title="question" kicker="IN" />

      {fanY.map((y, i) => (
        <Node key={y}
              x={500} y={y} w={224} h={76}
              kind="agent"
              tone={i === 1 ? "accent" : "trace"}
              active={i === 1}
              title={labels[i]!.title}
              subtitle={labels[i]!.sub}
              kicker={`state.${labels[i]!.key}`}
              delay={0.1 + i * 0.1} />
      ))}

      {fanY.map((y, i) => (
        <Edge key={`in-${y}`}
              from={{ x: 210, y: 290 }}
              to={{ x: 388, y }}
              curve={i === 0 ? -30 : i === 2 ? 30 : 0}
              tone={i === 1 ? "accent" : "trace"}
              arrow="forward"
              travel
              travelDuration={1.4 + i * 0.1}
              delay={0.5 + i * 0.05} />
      ))}

      {fanY.map((y, i) => (
        <Edge key={`out-${y}`}
              from={{ x: 612, y }}
              to={{ x: 778, y: 290 }}
              curve={i === 0 ? 30 : i === 2 ? -30 : 0}
              tone={i === 1 ? "accent" : "trace"}
              arrow="forward"
              travel
              travelDuration={1.4 + i * 0.1}
              delay={1.5 + i * 0.05} />
      ))}

      <Node x={852} y={290} w={176} h={84} kind="agent" tone="accent" active
            title="reviewer" subtitle="gemini-3.1-pro"
            kicker="REDUCE" delay={1.9} />

      {level !== "beginner" && (
        <>
          <text x={130} y={560} textAnchor="start"
                fontFamily="var(--font-mono)" fontSize="10.5"
                letterSpacing="2.6" fill="var(--text-faint)"
                style={{ textTransform: "uppercase" }}>
            ParallelAgent(sub_agents=[web, kb, sql])
          </text>
          <text x={860} y={560} textAnchor="end"
                fontFamily="var(--font-mono)" fontSize="10.5"
                letterSpacing="2.6" fill="var(--text-faint)"
                style={{ textTransform: "uppercase" }}>
            then SequentialAgent → reviewer
          </text>
        </>
      )}
    </Canvas>
  );
}
