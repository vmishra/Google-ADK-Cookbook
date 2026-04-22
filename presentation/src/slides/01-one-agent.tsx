import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { CodeCard } from "@/components/diagrams/CodeCard";
import { useSlideStore } from "@/state/useSlideStore";

export function OneAgentScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        The smallest unit of ADK. An{" "}
        <code className="text-[var(--accent)]">LlmAgent</code> with an
        instruction and one function tool. The model decides when to
        call the tool based on the tool's docstring and type hints.
      </p>
      {level !== "beginner" && (
        <p>
          Under the hood, ADK turns the function signature into a JSON
          schema, hands it to the model, executes the returned tool
          call, and feeds the result back into the next generation.
          Two round-trips per tool call.
        </p>
      )}
      {level === "advanced" && (
        <p>
          The <code>before_tool_callback</code> fires <em>before</em>
          the function runs — returning a value short-circuits the
          call. That is how safety, caching, and per-tenant policy
          layers are implemented without proxying.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="01 · primitive"
      title="One agent, one tool, one turn."
      lede="The whole framework reduces to this on the first page."
      left={left}
      right={<OneAgentDiagram level={level} />}
    />
  );
}

function OneAgentDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <div className="relative w-full h-full">
      <Canvas>
        <Node x={200} y={220} kind="user" title="User" subtitle='"roll a d20"' />
        <Node x={520} y={220} kind="agent" tone="accent" active
              title="LlmAgent" subtitle="gemini-3.1-flash" />
        <Node x={820} y={220} kind="tool" tone="trace"
              title="roll_die(sides)" subtitle="Python function" />

        <Edge from={{ x: 252, y: 220 }} to={{ x: 422, y: 220 }}
              arrow="forward" travel travelDuration={1.4} />
        <Edge from={{ x: 618, y: 220 }} to={{ x: 722, y: 220 }}
              tone="trace" arrow="forward" label="call" travel travelDuration={1.6} />
        <Edge from={{ x: 820, y: 258 }} to={{ x: 618, y: 258 }}
              curve={-40} tone="trace" arrow="forward" label="result" travel travelDuration={1.6} delay={1.7} />
        <Edge from={{ x: 422, y: 258 }} to={{ x: 252, y: 258 }}
              curve={-40} arrow="forward" label="reply" travel travelDuration={1.6} delay={3.2} />

        {level !== "beginner" && (
          <>
            <Node x={520} y={460} kind="model" title="Model round-trip" subtitle="schema · tool_call · response" tone="muted" />
            <Edge from={{ x: 520, y: 296 }} to={{ x: 520, y: 398 }} arrow="both" tone="muted" />
          </>
        )}
      </Canvas>

      {level === "advanced" && (
        <div className="absolute bottom-6 right-6">
          <CodeCard title="agent.py" language="python" delay={1.4}>
{`def roll_die(sides: int) -> int:
    """Roll a sides-sided die. Returns 1..sides."""
    return random.randint(1, sides)

root_agent = LlmAgent(
    name="roller",
    model="gemini-3.1-flash",
    instruction="Roll, then explain.",
    tools=[roll_die],
    before_tool_callback=log_tool,
)`}
          </CodeCard>
        </div>
      )}
    </div>
  );
}
