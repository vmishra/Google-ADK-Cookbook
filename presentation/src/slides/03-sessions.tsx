import { motion } from "motion/react";
import { Slide } from "@/components/shell/Slide";
import { Canvas } from "@/components/diagrams/Canvas";
import { Node } from "@/components/diagrams/Node";
import { Edge } from "@/components/diagrams/Edge";
import { useSlideStore } from "@/state/useSlideStore";
import { spring } from "@/lib/motion";

export function SessionsScene() {
  const { level } = useSlideStore();

  const left = (
    <div className="text-[14.5px] leading-[1.7] text-[var(--text-muted)] space-y-4">
      <p>
        A session is one conversation. Its state is a dict the agent
        reads and writes across turns. Four prefixes decide how long
        a value lives.
      </p>
      <ul className="list-none pl-0 space-y-2 font-mono text-[12.5px]">
        <li><span className="text-[var(--accent)]">(none)</span> &middot; this session</li>
        <li><span className="text-[var(--accent)]">user:</span> &middot; every session of this user</li>
        <li><span className="text-[var(--accent)]">app:</span> &middot; every session of this app</li>
        <li><span className="text-[var(--accent)]">temp:</span> &middot; this invocation only</li>
      </ul>
      {level === "advanced" && (
        <p>
          State mutations flow through <code>event.actions.state_delta</code>.
          Writing directly onto <code>session.state</code> from a tool
          bypasses the log — and replay, rewind, and audit along with
          it. Always go through <code>tool_context.state</code>.
        </p>
      )}
    </div>
  );

  return (
    <Slide
      kicker="03 · state"
      title="State has scope. Scope has prefixes."
      lede="Four levels of lifetime, one dict, one contract."
      left={left}
      right={<SessionsDiagram level={level} />}
    />
  );
}

function SessionsDiagram({ level }: { level: "beginner" | "intermediate" | "advanced" }) {
  return (
    <Canvas>
      {/* Four concentric stacks showing scope */}
      {[
        { y: 120, kicker: "APP:", label: 'app:motd',         sub: "every session of app", tone: "muted"  as const },
        { y: 240, kicker: "USER:", label: "user:tier = gold", sub: "every session of u42", tone: "trace" as const },
        { y: 360, kicker: "(session)", label: 'last_city = "Seattle"', sub: "this conversation", tone: "accent" as const },
        { y: 480, kicker: "TEMP:", label: "temp:access_token", sub: "this invocation only",   tone: "muted" as const },
      ].map((row, i) => (
        <motion.g
          key={row.y}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring, delay: 0.15 + i * 0.12 }}
        >
          <rect
            x={160}
            y={row.y - 40}
            width={680}
            height={80}
            rx={14}
            fill={row.tone === "accent"
              ? "color-mix(in oklab, var(--accent) 8%, var(--elev-1))"
              : row.tone === "trace"
                ? "color-mix(in oklab, var(--trace) 7%, var(--elev-1))"
                : "var(--elev-1)"}
            stroke={row.tone === "accent" ? "var(--accent-hairline)"
                 : row.tone === "trace" ? "var(--trace-hairline)"
                 : "var(--border-strong)"}
            strokeWidth={1}
          />
          <text x={184} y={row.y - 10}
                fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="2.6"
                fill={row.tone === "accent" ? "var(--accent)" : row.tone === "trace" ? "var(--trace)" : "var(--text-faint)"}
                style={{ textTransform: "uppercase" }}>
            {row.kicker}
          </text>
          <text x={184} y={row.y + 12}
                fontFamily="var(--font-mono)" fontSize="15"
                fill="var(--text)">
            {row.label}
          </text>
          <text x={184} y={row.y + 30}
                fontFamily="var(--font-sans)" fontSize="11.5"
                fill="var(--text-subtle)">
            {row.sub}
          </text>
        </motion.g>
      ))}

      {level !== "beginner" && (
        <>
          <Node x={110} y={240} kind="user" tone="muted" w={100} h={52} title="u42" kicker="USER" />
          <Edge from={{ x: 160, y: 240 }} to={{ x: 160, y: 240 }} tone="muted" arrow="none" />

          <Node x={890} y={360} kind="io" w={120} h={52} title="session s-1" kicker="ID" />

          <Node x={890} y={480} kind="io" tone="muted" w={120} h={52} title="wiped" kicker="END" />
        </>
      )}

      <motion.text
        x={500} y={580} textAnchor="middle"
        fontFamily="var(--font-serif)" fontStyle="italic"
        fontSize="17" fill="var(--text-faint)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
      >
        same dict, four lifetimes
      </motion.text>
    </Canvas>
  );
}
