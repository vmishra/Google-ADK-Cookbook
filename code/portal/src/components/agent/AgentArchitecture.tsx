/**
 * Interactive architecture view for one agent. Fetched from the
 * server's /introspect endpoint, rendered as a clickable tree on
 * top and a config panel on the bottom. Clicking any node in the
 * tree surfaces that node's full configuration — model, thinking
 * budget, instruction, output_key, tools — so a reader can see
 * what's happening architecturally without opening the source.
 *
 * Visual decisions (DESIGN.md):
 *   - Nodes are rounded-md cards with a coloured left rail: accent
 *     for LlmAgent, trace for orchestration wrappers (Sequential,
 *     Parallel, Loop), neutral for tools and toolsets.
 *   - Tree indentation uses an 18-px left gutter with a 1-px
 *     champagne-hairline connector drawn from each parent down to
 *     the baseline of the last child; a 1-px horizontal stub joins
 *     each child to the gutter.
 *   - Selected node gets an accent border + shadow-1. Active node
 *     (live, matches the author field on the current SSE event)
 *     gets a soft accent ring that animates.
 *   - Instruction blocks render as mono 12.5 px with paragraph
 *     breaks preserved but tracking slightly loosened for scannability.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bot, Layers, Shuffle, Repeat2, Wrench, PackageOpen } from "lucide-react";

import { fadeRise } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface ToolDescriptor {
  kind: string;
  name: string;
  description: string;
  wraps?: string;
  wraps_model?: string | null;
}

export interface AgentNode {
  name: string;
  kind: string;
  description?: string;
  model?: string;
  instruction?: string;
  output_key?: string;
  planner?: {
    kind?: string;
    thinking_level?: string;
    include_thoughts?: boolean;
    thinking_budget?: number;
  };
  tools?: ToolDescriptor[];
  sub_agents?: AgentNode[];
}

interface Props {
  baseUrl: string;
  activeAuthor?: string | null;
}

/* ---------------------------------------------------------------- */

export function AgentArchitecture({ baseUrl, activeAuthor }: Props) {
  const [tree, setTree] = useState<AgentNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetch(`${baseUrl}/introspect`)
      .then((r) => {
        if (!r.ok) throw new Error(`introspect ${r.status}`);
        return r.json();
      })
      .then((t: AgentNode) => {
        if (!alive) return;
        setTree(t);
        setSelectedId(idOf(t));
      })
      .catch((e) => {
        if (alive) setError(e.message || String(e));
      });
    return () => {
      alive = false;
    };
  }, [baseUrl]);

  const byId = useMemo(() => {
    const map = new Map<string, AgentNode | ToolDescriptor>();
    if (tree) indexTree(tree, map);
    return map;
  }, [tree]);

  if (error) {
    return (
      <div className="p-6 text-[13px] text-[var(--text-muted)]">
        Architecture unavailable — {error}. Start the agent server and
        the pane will populate.
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="p-6 text-[13px] text-[var(--text-subtle)] italic font-[var(--font-serif)]">
        loading architecture…
      </div>
    );
  }

  const selected = (selectedId && byId.get(selectedId)) || tree;

  return (
    <motion.div variants={fadeRise} initial="initial" animate="animate" className="flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <div className="kicker mb-1.5">architecture</div>
        <p className="text-[13px] leading-[1.55] text-[var(--text-muted)]">
          Click any node to inspect its model, instruction, and tools.
        </p>
      </div>

      <div className="px-4 pb-5">
        <TreeBranch
          node={tree}
          isLast
          selectedId={selectedId}
          activeAuthor={activeAuthor}
          onSelect={setSelectedId}
        />
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      <div className="px-6 pt-5 pb-8">
        <DetailPanel node={selected} />
      </div>
    </motion.div>
  );
}

/* ------------------------ tree ------------------------ */

function TreeBranch({
  node,
  isLast,
  selectedId,
  activeAuthor,
  onSelect,
}: {
  node: AgentNode;
  isLast: boolean;
  selectedId: string | null;
  activeAuthor?: string | null;
  onSelect: (id: string) => void;
}) {
  const children: Array<{ id: string; render: (isLast: boolean) => React.ReactNode }> = [];

  (node.sub_agents || []).forEach((child) => {
    const id = idOf(child);
    children.push({
      id,
      render: (last) => (
        <TreeBranch
          key={id}
          node={child}
          isLast={last}
          selectedId={selectedId}
          activeAuthor={activeAuthor}
          onSelect={onSelect}
        />
      ),
    });
  });

  (node.tools || []).forEach((tool) => {
    const id = `${node.name}#tool:${tool.name}`;
    children.push({
      id,
      render: (last) => (
        <ToolBranch
          key={id}
          parentName={node.name}
          tool={tool}
          isLast={last}
          selected={selectedId === id}
          onSelect={() => onSelect(id)}
        />
      ),
    });
  });

  return (
    <div className="relative">
      <NodeCard
        node={node}
        selected={selectedId === idOf(node)}
        active={!!activeAuthor && activeAuthor === node.name}
        onClick={() => onSelect(idOf(node))}
      />
      {children.length > 0 && (
        <div className="relative pl-[20px] mt-2">
          <Rail last={isLast} />
          {children.map((c, i) => (
            <div key={c.id} className="relative pl-[18px] pt-2 first:pt-0">
              <Branch />
              {c.render(i === children.length - 1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolBranch({
  parentName,
  tool,
  selected,
  onSelect,
}: {
  parentName: string;
  tool: ToolDescriptor;
  isLast: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ToolCard tool={tool} parentName={parentName} selected={selected} onClick={onSelect} />
  );
}

/** Vertical champagne rail connecting a parent to its last child. */
function Rail({ last }: { last: boolean }) {
  return (
    <span
      className="absolute top-0 left-0 w-px"
      style={{
        background: "var(--border)",
        bottom: last ? 0 : 0,
        height: "100%",
      }}
      aria-hidden
    />
  );
}

/** Horizontal 1-px stub from the rail into the child card. */
function Branch() {
  return (
    <span
      className="absolute left-0 top-[22px] h-px w-[14px]"
      style={{ background: "var(--border)" }}
      aria-hidden
    />
  );
}

/* ------------------------ nodes ------------------------ */

function NodeCard({
  node,
  selected,
  active,
  onClick,
}: {
  node: AgentNode;
  selected: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const style = kindStyle(node.kind);
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-[var(--radius-md)] border bg-[var(--elev-1)] transition-colors",
        selected
          ? "border-[var(--accent)] bg-[var(--elev-2)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--elev-2)]",
      )}
      style={{ boxShadow: selected ? "var(--shadow-1)" : undefined }}
    >
      {/* colour rail */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[var(--radius-md)]"
        style={{ background: style.rail }}
        aria-hidden
      />
      <div className="flex items-start gap-2.5 px-3 py-2 pl-3.5">
        <Icon size={14} strokeWidth={1.6} className="mt-[2px] shrink-0" style={{ color: style.rail }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13.5px] font-semibold text-[var(--text)] tracking-[-0.005em] truncate">
              {node.name}
            </span>
            <span
              className="text-[9.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] font-medium whitespace-nowrap"
              style={{ color: style.label }}
            >
              {style.kindLabel}
            </span>
          </div>
          {node.model && (
            <div className="text-[11px] font-[var(--font-mono)] text-[var(--text-muted)] mt-0.5 truncate">
              {node.model}
              {node.planner?.thinking_level && (
                <span className="ml-2 text-[var(--text-subtle)]">
                  · {node.planner.thinking_level.toLowerCase()}
                </span>
              )}
            </div>
          )}
          {node.output_key && (
            <div className="text-[10.5px] tracking-[0.1em] font-[var(--font-mono)] text-[var(--text-subtle)] mt-0.5 truncate">
              → state.{node.output_key}
            </div>
          )}
        </div>
      </div>
      {active && (
        <span
          className="absolute inset-0 rounded-[var(--radius-md)] pointer-events-none"
          style={{
            boxShadow: "0 0 0 1px var(--accent), 0 0 16px -4px var(--accent)",
            animation: "adk-node-pulse 1.6s ease-in-out infinite",
          }}
          aria-hidden
        />
      )}
      <style>{`
        @keyframes adk-node-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>
    </button>
  );
}

function ToolCard({
  tool,
  parentName: _parent,
  selected,
  onClick,
}: {
  tool: ToolDescriptor;
  parentName: string;
  selected: boolean;
  onClick: () => void;
}) {
  const isAgentTool = tool.kind === "agent_tool";
  const isToolset = tool.kind.endsWith("Toolset");
  const Icon = isAgentTool ? Bot : isToolset ? PackageOpen : Wrench;
  const label = isAgentTool ? "agent tool" : isToolset ? "toolset" : "function";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-[var(--radius-sm)] border transition-colors",
        selected
          ? "border-[var(--accent)] bg-[var(--elev-1)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--elev-1)]",
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Icon size={11} strokeWidth={1.8} className="shrink-0 text-[var(--text-subtle)]" />
        <span className="font-[var(--font-mono)] text-[12px] text-[var(--text)] truncate">
          {tool.name}
        </span>
        <span className="ml-auto text-[9.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)] whitespace-nowrap">
          {label}
        </span>
        {isAgentTool && tool.wraps && (
          <span className="text-[10px] font-[var(--font-mono)] text-[var(--accent)] whitespace-nowrap">
            ↗ {tool.wraps}
          </span>
        )}
      </div>
    </button>
  );
}

/* ------------------------ detail panel ------------------------ */

function DetailPanel({ node }: { node: AgentNode | ToolDescriptor }) {
  if (isAgentNode(node)) return <AgentDetail node={node} />;
  return <ToolDetail tool={node as ToolDescriptor} />;
}

/** AgentNode shapes always contain a kind like 'LlmAgent' /
 *  'SequentialAgent' etc. Tool descriptors carry 'function',
 *  'agent_tool', or '*Toolset'. */
function isAgentNode(v: any): v is AgentNode {
  if (!v || typeof v !== "object" || typeof v.kind !== "string") return false;
  const k = v.kind;
  return (
    k === "LlmAgent" ||
    k === "Agent" ||
    k === "SequentialAgent" ||
    k === "ParallelAgent" ||
    k === "LoopAgent" ||
    k === "BaseAgent"
  );
}

function AgentDetail({ node }: { node: AgentNode }) {
  const style = kindStyle(node.kind);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] tracking-[0.28em] uppercase font-[var(--font-mono)] font-medium"
            style={{ color: style.label }}
          >
            {style.kindLabel}
          </span>
          <span className="h-px w-6" style={{ background: "var(--accent-hairline)" }} />
        </div>
        <h3 className="font-[var(--font-serif)] text-[22px] leading-[1.2] tracking-[-0.01em] text-[var(--text)]">
          {node.name}
        </h3>
        {node.description && (
          <p className="text-[13px] leading-[1.6] text-[var(--text-muted)] mt-2">
            {node.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {node.model && <KV label="model">{node.model}</KV>}
        {node.planner?.thinking_level && (
          <KV label="thinking">{node.planner.thinking_level.toLowerCase()}</KV>
        )}
        {node.planner?.thinking_budget != null && (
          <KV label="thought budget">{node.planner.thinking_budget.toString()}</KV>
        )}
        {node.output_key && <KV label="writes">state.{node.output_key}</KV>}
        <KV label="sub-agents">{(node.sub_agents || []).length.toString()}</KV>
        <KV label="tools">{(node.tools || []).length.toString()}</KV>
      </div>

      {node.instruction && (
        <Section label="instruction">
          <pre className="mt-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 overflow-auto max-h-[340px] text-[12px] leading-[1.55] font-[var(--font-mono)] text-[var(--text)] whitespace-pre-wrap">
            {node.instruction}
          </pre>
        </Section>
      )}

      {node.tools && node.tools.length > 0 && (
        <Section label={`tools · ${node.tools.length}`}>
          <ul className="space-y-1.5 mt-1">
            {node.tools.map((t) => (
              <li key={t.name}>
                <ToolRow tool={t} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {node.sub_agents && node.sub_agents.length > 0 && (
        <Section label={`sub-agents · ${node.sub_agents.length}`}>
          <ul className="space-y-1 mt-1 text-[12.5px] text-[var(--text-muted)]">
            {node.sub_agents.map((s) => (
              <li key={s.name} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                <span className="font-[var(--font-mono)] text-[var(--text)]">{s.name}</span>
                <span className="text-[var(--text-subtle)]">· {s.kind}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function ToolDetail({ tool }: { tool: ToolDescriptor }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="kicker mb-1">tool · {tool.kind.replace("_", " ")}</div>
        <div className="flex items-baseline gap-3">
          <h3 className="font-[var(--font-mono)] text-[18px] font-medium text-[var(--text)]">
            {tool.name}
          </h3>
          {tool.wraps && (
            <span className="text-[11px] font-[var(--font-mono)] text-[var(--accent)]">
              ↗ wraps {tool.wraps}
            </span>
          )}
        </div>
      </div>
      {tool.description && (
        <Section label="description">
          <p className="text-[13px] leading-[1.6] text-[var(--text)] whitespace-pre-wrap">
            {tool.description}
          </p>
        </Section>
      )}
      {tool.wraps_model && (
        <KV label="inner model">{tool.wraps_model}</KV>
      )}
    </div>
  );
}

function ToolRow({ tool }: { tool: ToolDescriptor }) {
  const isAgent = tool.kind === "agent_tool";
  const Icon = isAgent ? Bot : Wrench;
  return (
    <div className="flex items-start gap-2 text-[12.5px]">
      <Icon size={11} strokeWidth={1.8} className="mt-[3px] shrink-0 text-[var(--text-subtle)]" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-mono)] text-[var(--text)]">{tool.name}</span>
          {isAgent && tool.wraps && (
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--accent)]">
              ↗ {tool.wraps}
            </span>
          )}
        </div>
        {tool.description && (
          <p className="text-[11.5px] leading-[1.5] text-[var(--text-muted)] mt-0.5">
            {tool.description}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="kicker">{label}</div>
      {children}
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9.5px] tracking-[0.22em] uppercase font-[var(--font-mono)] text-[var(--text-subtle)] font-medium">
        {label}
      </span>
      <span className="text-[12.5px] font-[var(--font-mono)] text-[var(--text)] truncate">
        {children}
      </span>
    </div>
  );
}

/* ------------------------ helpers ------------------------ */

function kindStyle(kind: string): {
  rail: string;
  label: string;
  kindLabel: string;
  icon: typeof Bot;
} {
  if (kind === "LlmAgent" || kind === "Agent") {
    return {
      rail: "var(--accent)",
      label: "var(--accent)",
      kindLabel: "llm agent",
      icon: Bot,
    };
  }
  if (kind === "SequentialAgent") {
    return { rail: "var(--trace)", label: "var(--trace)", kindLabel: "sequential", icon: Layers };
  }
  if (kind === "ParallelAgent") {
    return { rail: "var(--trace)", label: "var(--trace)", kindLabel: "parallel", icon: Shuffle };
  }
  if (kind === "LoopAgent") {
    return { rail: "var(--trace)", label: "var(--trace)", kindLabel: "loop", icon: Repeat2 };
  }
  return { rail: "var(--border-strong)", label: "var(--text-subtle)", kindLabel: kind.toLowerCase(), icon: Wrench };
}

function idOf(node: AgentNode): string {
  return node.name;
}

function indexTree(node: AgentNode, map: Map<string, AgentNode | ToolDescriptor>) {
  map.set(idOf(node), node);
  (node.tools || []).forEach((t) => {
    map.set(`${node.name}#tool:${t.name}`, t);
  });
  (node.sub_agents || []).forEach((s) => indexTree(s, map));
}
