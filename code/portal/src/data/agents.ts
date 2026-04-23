/**
 * Agent registry. One entry per agent under code/agents/.
 * The portal renders these on the home grid and uses `baseUrl` + `modality`
 * on each agent's page to wire the correct chat / voice / computer-use panel.
 */

export type Modality =
  | "text"
  | "voice"
  | "computer-use"
  | "deep-research"
  | "eval"
  | "video";

export interface AgentMeta {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  kicker: string;
  summary: string;
  baseUrl: string;
  modality: Modality;
  pattern: string;
  models: string[];
  toolCount?: number;
  difficulty: "basic" | "intermediate" | "advanced";
  notice: string[];
  prompts: string[];
  dashboardUrl?: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: "concierge",
    number: "01",
    title: "Concierge",
    subtitle: "One LlmAgent, a curated toolbox.",
    kicker: "hospitality · agentic",
    summary:
      "A heritage-hotel concierge that holds rooms, secures dining, " +
      "surfaces amenities, and recommends local experiences. Tool " +
      "selection, multi-turn state, and tone are the model's job.",
    baseUrl: "http://127.0.0.1:8001",
    modality: "text",
    pattern: "LlmAgent + 8 function tools",
    models: ["gemini-3-flash-preview"],
    toolCount: 8,
    difficulty: "basic",
    notice: [
      "Canonical google/adk-samples shape — root_agent at module top.",
      "Tools are plain Python functions, no FunctionTool wrapper.",
      "Session state carries room holds and dining across turns.",
    ],
    prompts: [
      "Surface a heritage suite for three nights from 8 November, guest is Ananya Rao. Secure it if available.",
      "Arrange dinner for four at Seto on Friday at 8:30, under Mr Rao.",
      "An early-morning running route and a café nearby for coffee after.",
      "What's on my slate right now?",
    ],
  },
  {
    id: "travel-planner",
    number: "02",
    title: "Travel planner",
    subtitle: "Sequential deep-research pipeline.",
    kicker: "travel · deep research",
    summary:
      "A three-phase pipeline — planner, parallel flight/hotel/activity " +
      "researchers, composer. State is the contract between phases. " +
      "Two model tiers: Flash for reasoning, Flash-Lite for tool-heavy " +
      "research.",
    baseUrl: "http://127.0.0.1:8002",
    modality: "deep-research",
    pattern: "SequentialAgent(planner, ParallelAgent(…), composer)",
    models: ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"],
    difficulty: "intermediate",
    notice: [
      "Three phases run as one SSE stream; portal shows which sub-agent is speaking.",
      "Researchers run concurrently against mocked tools with stable seeds.",
      "Composer writes an editorial itinerary — not bullet soup.",
    ],
    prompts: [
      "Two of us, Delhi to Lisbon, 8–14 November, premium cabin. We like architecture, tile work, quiet mornings, and one good sushi night.",
      "A week in Lisbon from March 14th, with a 13-year-old, mid-range hotels, food as the theme.",
      "DEL–LIS, 10 to 16 Feb, business, luxury hotels, interest in art.",
    ],
  },
  {
    id: "payments-support",
    number: "03",
    title: "Payments voice support",
    subtitle: "Native-audio, tools inside the call.",
    kicker: "payments · voice",
    summary:
      "A voice support specialist for a payments company. Native-audio " +
      "speech-to-speech via Gemini Live. Looks up transactions, issues " +
      "refunds, files disputes, blocks cards — all inside the audio turn.",
    baseUrl: "http://127.0.0.1:8003",
    modality: "voice",
    pattern: "LlmAgent + run_live() + LiveRequestQueue",
    models: ["gemini-3.1-flash-live-preview"],
    difficulty: "advanced",
    notice: [
      "Speech-to-speech, not ASR + TTS. Transcripts are a side-channel.",
      "Session resumption — a dropped socket reconnects to the same turn.",
      "Voice selection via RunConfig.speech_config (VOICE_NAME env).",
    ],
    prompts: [
      "Hi, I see a charge I don't recognise. Reference TXN-PF-9921, Swiggy, this morning.",
      "I lost my card last night. The last four are 4412.",
      "The product never arrived. Can you file a dispute? Reference TXN-AM-7734.",
    ],
  },
  {
    id: "food-delivery-support",
    number: "04",
    title: "Food delivery support",
    subtitle: "Computer-use on a real merchant console.",
    kicker: "delivery · computer-use",
    summary:
      "Hybrid agent — structured backend tools plus a real Chromium " +
      "session driving a merchant ops console. The model picks: single " +
      "auditable action, or a walkthrough of the internal dashboard.",
    baseUrl: "http://127.0.0.1:8004",
    modality: "computer-use",
    pattern: "LlmAgent + ComputerUseToolset + 4 tools",
    models: ["gemini-2.5-computer-use-preview-10-2025"],
    toolCount: 4,
    difficulty: "advanced",
    dashboardUrl: "http://127.0.0.1:8004/dashboard/",
    notice: [
      "Origin allowlist in before_tool_callback — agent can't roam.",
      "Destructive-click gate: Cancel/Delete require an approval flag.",
      "Screenshots flow through the SSE stream into a live agent-view pane.",
    ],
    prompts: [
      "Order FD-71045 — customer says it's 40 minutes late and the driver is not moving. Take a look at the dashboard and tell me what you'd do next.",
      "The customer on FD-71023 wants ₹ 200 off for a missing item. Issue a partial refund.",
      "Cancel FD-71078. The customer asked me to.",
    ],
  },
  {
    id: "beauty-advisor",
    number: "05",
    title: "Beauty advisor",
    subtitle: "Three-tier hierarchy with skills + memory.",
    kicker: "beauty · advanced",
    summary:
      "Root advisor → three coordinators (skincare, makeup, haircare) " +
      "→ nine specialist sub-agents. Skills are unlocked progressively, " +
      "profile memory is shared across the whole hierarchy, and three " +
      "model tiers balance cost against the work each layer does.",
    baseUrl: "http://127.0.0.1:8005",
    modality: "text",
    pattern: "LlmAgent + sub_agents + AgentTool specialists",
    models: ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"],
    difficulty: "advanced",
    notice: [
      "Two kinds of delegation — sub_agents for transfer, AgentTool for composition.",
      "Skills registry with card / playbook split — root stays small.",
      "Profile memory is the shared context carrying across the hierarchy.",
      "Three model tiers: root, coordinators, specialists.",
    ],
    prompts: [
      "Hi, I'm looking for help with skincare. Combination skin, breakouts on my chin, mid-range budget, prefer fragrance-free.",
      "Can you sort out a foundation too? Neutral undertone, medium coverage, satin finish.",
      "Let's add haircare — fine, wavy, recently coloured, I'm in Mumbai.",
      "I'd rather skip retinol, it's too much for my skin.",
    ],
  },
  {
    id: "hitl-payout",
    number: "06",
    title: "HITL payout approval",
    subtitle: "Human-in-the-loop + PDF voucher artifact.",
    kicker: "finance · hitl + artifacts",
    summary:
      "A partner-payout desk for a fintech. Drafts vendor payouts, " +
      "routes anything ≥ ₹50,000 to a human via a long-running tool, " +
      "and streams a one-page PDF voucher through the artifact service " +
      "after the money posts.",
    baseUrl: "http://127.0.0.1:8006",
    modality: "text",
    pattern: "LlmAgent + LongRunningFunctionTool + ArtifactService",
    models: ["gemini-3-flash-preview"],
    toolCount: 8,
    difficulty: "advanced",
    notice: [
      "request_approval is a LongRunningFunctionTool — session suspends on its call.",
      "Approve / Deny buttons POST to /approve, which writes a state_delta.",
      "Voucher PDF is saved via tool_context.save_artifact and served over HTTP.",
      "check_approval on the resumed turn is how the agent reads the human decision.",
    ],
    prompts: [
      "Draft a payout of ₹75,000 to V-207 for the October campaign retainer. GL per their master. Route to finance-controllers.",
      "V-101 is owed ₹42,000 for last week's logistics invoices. Book it.",
      "Draft ₹1,20,000 to V-314 for the Q3 utilities true-up, memo \"Q3 power reconciliation, contract SKY-2025-11\".",
      "Show me everything currently pending.",
    ],
  },
  {
    id: "a2a-loan-desk",
    number: "07",
    title: "A2A loan desk",
    subtitle: "Two processes, one decision — officer calls bureau.",
    kicker: "lending · federation",
    summary:
      "A small-business loan officer on :8007 that calls BharatCredit — " +
      "a credit bureau running in a separate process on :8017 — for a " +
      "scoring report, then decides. The cross-process hop is the whole " +
      "point: each agent has its own runner, metrics, and introspect.",
    baseUrl: "http://127.0.0.1:8007",
    modality: "deep-research",
    pattern: "LlmAgent + httpx → remote LlmAgent peer",
    models: ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"],
    toolCount: 4,
    difficulty: "advanced",
    notice: [
      "Two servers, two ports — start server_bureau.py before server_officer.py.",
      "The bureau exposes /score (LLM-free) and /chat (conversational).",
      "request_credit_report posts to BUREAU_URL over HTTP; fails loudly if unreachable.",
      "peer_call SSE frames mark the moment the call crosses the boundary.",
    ],
    prompts: [
      "Pull APP-501 and let's work the file.",
      "Look at APP-612. Work it end to end — bureau, EMI, decision.",
      "APP-704 — they're asking for ₹7.5L at 30 months, business is export packaging. What's the call?",
    ],
  },
  {
    id: "eval-harness",
    number: "08",
    title: "Eval harness",
    subtitle: "Regression suites with pass/fail tiles.",
    kicker: "quality · evaluation",
    summary:
      "Loads canned prompts with deterministic rubrics (substring, " +
      "tool-call presence, latency cap), runs them against a live " +
      "target agent over HTTP, and streams per-case verdicts as tiles. " +
      "Evaluation at the boundary — target is a black box.",
    baseUrl: "http://127.0.0.1:8008",
    modality: "eval",
    pattern: "LlmAgent + rubric engine + /run/{suite} SSE",
    models: ["gemini-3-flash-preview"],
    difficulty: "intermediate",
    notice: [
      "Suites target the concierge (:8001) and HITL payout (:8006) — start them first.",
      "Rubrics are rule-based: contains_any/_all, tools_called/_forbidden, max_total_ms.",
      "The /run/{suite_id} endpoint streams case_started → case_result → suite_summary.",
      "Each tile drills down into checks, tool calls, and the target's final text.",
    ],
    prompts: [
      "What eval suites do you have?",
      "Run just the off-scope refusal case from the concierge suite.",
      "Run the high-value-needs-approval case from the payout suite.",
    ],
  },
  {
    id: "mcp-knowledge-desk",
    number: "09",
    title: "MCP knowledge desk",
    subtitle: "Engineering onboarding via an external MCP server.",
    kicker: "knowledge · mcp",
    summary:
      "Agent with zero hand-written tools — the entire toolbox comes " +
      "from @modelcontextprotocol/server-filesystem launched over stdio " +
      "by the ADK MCPToolset and scoped to the cookbook's docs/ dir. " +
      "Same shape drops in GitHub, Playwright-MCP, Slack, Linear.",
    baseUrl: "http://127.0.0.1:8009",
    modality: "text",
    pattern: "LlmAgent + MCPToolset(Stdio) → npx @mcp/server-filesystem",
    models: ["gemini-3-flash-preview"],
    difficulty: "advanced",
    notice: [
      "Needs Node — the MCP server is downloaded by npx on first run.",
      "MCP_ROOT pins the server to docs/; override to point elsewhere.",
      "tool_filter keeps it read-only — the agent can't mutate the repo.",
      "Architecture tab surfaces MCPToolset as an opaque handle; tool names are fs_* at call time.",
    ],
    prompts: [
      "What chapters does the cookbook cover?",
      "Show me how the evaluation chapter sets up trajectory scoring.",
      "Where does the cookbook explain LoopAgent stopping conditions?",
      "Does the cookbook discuss running agents on Cloud Run?",
    ],
  },
];

export function findAgent(id: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.id === id);
}
