/**
 * Mini SVG topology — one glyph per agent pattern.
 * Monochromatic, 1-px strokes, currentColor. 96×44 cap.
 * The accent fills the "root" node only; satellites are hairline rings.
 */
import type { AgentMeta } from "@/data/agents";

interface Props {
  agent: AgentMeta;
  accent?: boolean;   // tint the root node with the champagne accent
}

export function AgentTopology({ agent, accent = false }: Props) {
  const W = 96;
  const H = 44;
  const stroke = "currentColor";
  const node = accent ? "var(--accent)" : "currentColor";
  switch (agent.id) {
    case "concierge":
      return <HubAndSpokes w={W} h={H} stroke={stroke} node={node} />;
    case "travel-planner":
      return <SequentialParallel w={W} h={H} stroke={stroke} node={node} />;
    case "payments-support":
      return <LiveAudio w={W} h={H} stroke={stroke} node={node} />;
    case "food-delivery-support":
      return <BrowserPlus w={W} h={H} stroke={stroke} node={node} />;
    case "beauty-advisor":
      return <Tree w={W} h={H} stroke={stroke} node={node} />;
    case "hitl-payout":
      return <ApprovalGate w={W} h={H} stroke={stroke} node={node} />;
    case "a2a-loan-desk":
      return <TwoPeers w={W} h={H} stroke={stroke} node={node} />;
    case "eval-harness":
      return <PassFailGrid w={W} h={H} stroke={stroke} node={node} />;
    case "mcp-knowledge-desk":
      return <McpServerLink w={W} h={H} stroke={stroke} node={node} />;
    case "video-coach":
      return <CameraWaves w={W} h={H} stroke={stroke} node={node} />;
    default:
      return null;
  }
}

/* ---------- concierge: hub + six satellites on an arc ---------- */
function HubAndSpokes({ w, h, stroke, node }: Shapes) {
  const cx = w / 2, cy = h / 2;
  const r = 14;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const t = -Math.PI / 2 + (i / 5) * Math.PI;
    return { x: cx + Math.cos(t) * (w * 0.42), y: cy + Math.sin(t) * (h * 0.42) };
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {pts.map((p, i) => (
        <line
          key={i}
          x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke={stroke} strokeOpacity="0.4" strokeWidth="1"
        />
      ))}
      <circle cx={cx} cy={cy} r={5} fill={node} />
      <circle cx={cx} cy={cy} r={r} stroke={stroke} strokeOpacity="0.4" fill="none" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={stroke} />
      ))}
    </svg>
  );
}

/* ---------- travel planner: node → (3 parallel) → node ---------- */
function SequentialParallel({ w, h, stroke, node }: Shapes) {
  const cy = h / 2;
  const x1 = 8, x2 = w * 0.38, x3 = w * 0.66, x4 = w - 8;
  const ys = [8, cy, h - 8];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <line x1={x1} y1={cy} x2={x2} y2={cy} stroke={stroke} strokeOpacity="0.4" />
      {ys.map((y, i) => (
        <g key={i}>
          <line x1={x2} y1={cy} x2={x3} y2={y} stroke={stroke} strokeOpacity="0.35" />
          <line x1={x3} y1={y} x2={x4 - 6} y2={cy} stroke={stroke} strokeOpacity="0.35" />
          <circle cx={x3} cy={y} r={2.8} fill={stroke} />
        </g>
      ))}
      <circle cx={x1} cy={cy} r={4} fill={node} />
      <circle cx={x2} cy={cy} r={3} fill={stroke} />
      <circle cx={x4} cy={cy} r={4} fill={node} />
    </svg>
  );
}

/* ---------- voice: node + audio arcs ---------- */
function LiveAudio({ w, h, stroke, node }: Shapes) {
  const cx = w / 2, cy = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {[10, 18, 26].map((r, i) => (
        <path
          key={`l-${i}`}
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy - 0.001}`}
          stroke={stroke} strokeOpacity={0.5 - i * 0.12} fill="none"
          transform={`rotate(90, ${cx - r}, ${cy})`}
        />
      ))}
      {[10, 18, 26].map((r, i) => (
        <path
          key={`r-${i}`}
          d={`M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy - 0.001}`}
          stroke={stroke} strokeOpacity={0.5 - i * 0.12} fill="none"
          transform={`rotate(-90, ${cx + r}, ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={5} fill={node} />
    </svg>
  );
}

/* ---------- computer-use: node + mini browser ---------- */
function BrowserPlus({ w, h, stroke, node }: Shapes) {
  const cx = 20, cy = h / 2;
  const bx = 44, by = 8, bw = w - 52, bh = h - 16;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <line x1={cx + 4} y1={cy} x2={bx} y2={cy} stroke={stroke} strokeOpacity="0.4" />
      <rect x={bx} y={by} width={bw} height={bh} rx="3" stroke={stroke} strokeOpacity="0.5" fill="none" />
      <line x1={bx} y1={by + 6} x2={bx + bw} y2={by + 6} stroke={stroke} strokeOpacity="0.5" />
      <circle cx={bx + 3} cy={by + 3} r={1} fill={stroke} />
      <circle cx={bx + 7} cy={by + 3} r={1} fill={stroke} />
      <circle cx={bx + 11} cy={by + 3} r={1} fill={stroke} />
      <line x1={bx + 6} y1={by + 14} x2={bx + bw - 6} y2={by + 14} stroke={stroke} strokeOpacity="0.3" />
      <line x1={bx + 6} y1={by + 20} x2={bx + bw - 14} y2={by + 20} stroke={stroke} strokeOpacity="0.3" />
      <circle cx={cx} cy={cy} r={5} fill={node} />
    </svg>
  );
}

/* ---------- beauty: 1 → 3 → 9 tree ---------- */
function Tree({ w, h, stroke, node }: Shapes) {
  const root = { x: w / 2, y: 6 };
  const mid = [w * 0.2, w * 0.5, w * 0.8].map((x) => ({ x, y: h / 2 }));
  const leafY = h - 4;
  const leafGroups = mid.map((m) =>
    [m.x - 8, m.x, m.x + 8].map((x) => ({ x, y: leafY })),
  );
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {mid.map((m, i) => (
        <line key={`rm-${i}`} x1={root.x} y1={root.y} x2={m.x} y2={m.y}
              stroke={stroke} strokeOpacity="0.35" />
      ))}
      {leafGroups.map((grp, i) =>
        grp.map((l, j) => (
          <line key={`ml-${i}-${j}`} x1={mid[i]!.x} y1={mid[i]!.y} x2={l.x} y2={l.y}
                stroke={stroke} strokeOpacity="0.25" />
        )),
      )}
      <circle cx={root.x} cy={root.y} r={3.5} fill={node} />
      {mid.map((m, i) => (
        <circle key={`m-${i}`} cx={m.x} cy={m.y} r={2.8} fill={stroke} />
      ))}
      {leafGroups.flat().map((l, i) => (
        <circle key={`l-${i}`} cx={l.x} cy={l.y} r={1.6} fill={stroke} opacity="0.7" />
      ))}
    </svg>
  );
}

/* ---------- HITL payout: node → check-gate → posted node ---------- */
function ApprovalGate({ w, h, stroke, node }: Shapes) {
  const cy = h / 2;
  const ax = 10, gx = w * 0.46, bx = w - 10;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <line x1={ax + 4} y1={cy} x2={gx - 9} y2={cy} stroke={stroke} strokeOpacity="0.4" />
      <line x1={gx + 9} y1={cy} x2={bx - 4} y2={cy} stroke={stroke} strokeOpacity="0.4" />
      {/* gate: rounded square with a checkmark */}
      <rect x={gx - 9} y={cy - 9} width="18" height="18" rx="3"
            stroke={stroke} strokeOpacity="0.6" fill="none" />
      <polyline
        points={`${gx - 4},${cy} ${gx - 1},${cy + 3} ${gx + 5},${cy - 4}`}
        stroke={node} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={ax} cy={cy} r={4} fill={node} />
      <circle cx={bx} cy={cy} r={3} fill={stroke} />
    </svg>
  );
}

/* ---------- A2A: two nodes across a dashed boundary ---------- */
function TwoPeers({ w, h, stroke, node }: Shapes) {
  const cy = h / 2;
  const ax = 12, bx = w - 12;
  const mid = w / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <line x1={ax + 4} y1={cy} x2={bx - 4} y2={cy}
            stroke={stroke} strokeOpacity="0.4" />
      {/* boundary */}
      <line x1={mid} y1={4} x2={mid} y2={h - 4}
            stroke={stroke} strokeOpacity="0.35" strokeDasharray="2 3" />
      {/* packet dot on the wire */}
      <circle cx={mid} cy={cy} r={1.8} fill={node} />
      <circle cx={ax} cy={cy} r={4} fill={node} />
      <circle cx={bx} cy={cy} r={4} fill={node} />
      {/* tiny orbits hint at each being its own process */}
      <circle cx={ax} cy={cy} r={8} stroke={stroke} strokeOpacity="0.25" fill="none" />
      <circle cx={bx} cy={cy} r={8} stroke={stroke} strokeOpacity="0.25" fill="none" />
    </svg>
  );
}

/* ---------- Eval: 3×2 pass/fail grid with one fail ---------- */
function PassFailGrid({ w, h, stroke, node }: Shapes) {
  const cols = 3, rows = 2;
  const cellW = 16, cellH = 12, gap = 3;
  const totalW = cols * cellW + (cols - 1) * gap;
  const totalH = rows * cellH + (rows - 1) * gap;
  const x0 = (w - totalW) / 2;
  const y0 = (h - totalH) / 2;
  // indices 0..5 laid out row-major; mark one as fail for interest.
  const failIdx = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = x0 + c * (cellW + gap);
        const y = y0 + r * (cellH + gap);
        const isFail = i === failIdx;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={cellW} height={cellH} rx="2"
              stroke={stroke} strokeOpacity="0.55"
              fill={isFail ? "none" : node}
              fillOpacity={isFail ? 0 : 0.85}
            />
            {isFail && (
              <g stroke={stroke} strokeOpacity="0.85" strokeLinecap="round">
                <line x1={x + 4} y1={y + 4} x2={x + cellW - 4} y2={y + cellH - 4} />
                <line x1={x + cellW - 4} y1={y + 4} x2={x + 4} y2={y + cellH - 4} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- MCP: agent node + external server box via stdio ---------- */
function McpServerLink({ w, h, stroke, node }: Shapes) {
  const cx = 18, cy = h / 2;
  const bx = 48, by = 9, bw = w - 56, bh = h - 18;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      {/* stdio link — dashed to evoke the IPC pipe */}
      <line x1={cx + 4} y1={cy} x2={bx} y2={cy}
            stroke={stroke} strokeOpacity="0.5" strokeDasharray="2 2" />
      {/* server box */}
      <rect x={bx} y={by} width={bw} height={bh} rx="3"
            stroke={stroke} strokeOpacity="0.55" fill="none" />
      {/* MCP label as three stacked bars */}
      <line x1={bx + 5} y1={by + 7}  x2={bx + bw - 5} y2={by + 7}
            stroke={stroke} strokeOpacity="0.45" />
      <line x1={bx + 5} y1={by + 13} x2={bx + bw - 9} y2={by + 13}
            stroke={stroke} strokeOpacity="0.35" />
      <line x1={bx + 5} y1={by + 19} x2={bx + bw - 14} y2={by + 19}
            stroke={stroke} strokeOpacity="0.3" />
      <circle cx={cx} cy={cy} r={5} fill={node} />
    </svg>
  );
}

/* ---------- Live video: node + camera rectangle + three wave arcs ---------- */
function CameraWaves({ w, h, stroke, node }: Shapes) {
  const cx = w - 18, cy = h / 2;
  const nx = 14;
  // camera body
  const camW = 18, camH = 12;
  const camX = cx - camW / 2;
  const camY = cy - camH / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <line x1={nx + 4} y1={cy} x2={camX} y2={cy}
            stroke={stroke} strokeOpacity="0.4" />
      {/* camera body with a small lens notch top-left */}
      <rect x={camX} y={camY} width={camW} height={camH} rx="2"
            stroke={stroke} strokeOpacity="0.6" fill="none" />
      <rect x={camX + 2} y={camY - 2.5} width="5" height="2.5"
            stroke={stroke} strokeOpacity="0.55" fill="none" />
      <circle cx={cx} cy={cy} r={2.6} stroke={stroke} strokeOpacity="0.7" fill="none" />
      {/* signal waves radiating left off the camera */}
      {[6, 11, 16].map((r, i) => (
        <path key={i}
              d={`M ${camX - 2} ${cy - r * 0.7} A ${r} ${r} 0 0 0 ${camX - 2} ${cy + r * 0.7}`}
              stroke={stroke} strokeOpacity={0.45 - i * 0.1} fill="none" />
      ))}
      <circle cx={nx} cy={cy} r={4} fill={node} />
    </svg>
  );
}

interface Shapes { w: number; h: number; stroke: string; node: string }
