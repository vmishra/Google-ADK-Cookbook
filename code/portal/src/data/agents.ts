/**
 * Agent registry. One entry per agent under code/agents/.
 * The portal renders these on the home grid and uses `baseUrl` + `modality`
 * on each agent's page to wire the correct chat / voice / computer-use panel.
 */

export type Modality = "text" | "voice" | "computer-use" | "deep-research";

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
];

export function findAgent(id: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.id === id);
}
