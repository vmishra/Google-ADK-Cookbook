/**
 * Storyboard for the "trace a request" cinematic.
 *
 * Each beat specifies:
 *   - duration    (ms of dwell before next beat)
 *   - narration   (one-line caption, left-pane voice)
 *   - active      (node ids that pulse during this beat)
 *   - show        (node ids that should fade in during this beat)
 *   - flows       (edge ids to animate / travel during this beat)
 *   - code        (optional code card text + title)
 *
 * The stage reads this and orchestrates Nodes/Edges accordingly.
 */

export interface Flow {
  id: string;
  from: string;
  to: string;
  tone?: "accent" | "trace" | "muted";
  curve?: number;
  label?: string;
  arrow?: "forward" | "back" | "both" | "none";
}

export interface NodeDef {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  kind: "agent" | "tool" | "service" | "model" | "user" | "io";
  title: string;
  subtitle?: string;
  kicker?: string;
  tone?: "default" | "accent" | "trace" | "muted";
}

export const NODES: NodeDef[] = [
  { id: "user",         x:  110, y: 340, kind: "user",    title: "user",          subtitle: "voice · text",      kicker: "IN" },
  { id: "runner",       x:  290, y: 340, kind: "service", title: "Runner",        subtitle: "run_live",          kicker: "RUNTIME", tone: "accent" },
  { id: "session",      x:  290, y: 530, kind: "service", title: "SessionService",subtitle: "vertex-ai",         kicker: "STATE",   tone: "trace" },
  { id: "memory",       x:  110, y: 530, kind: "service", title: "MemoryService", subtitle: "memory bank",       kicker: "RECALL",  tone: "trace" },
  { id: "coordinator",  x:  510, y: 200, kind: "agent",   title: "coordinator",   subtitle: "LlmAgent · pro",    kicker: "ROUTE",   tone: "accent" },
  { id: "planner",      x:  510, y: 360, kind: "agent",   title: "reservations",  subtitle: "SequentialAgent",   kicker: "SPECIALIST", tone: "accent" },
  { id: "search",       x:  720, y: 280, kind: "tool",    title: "search_rest",   subtitle: "MCP · open_table",  kicker: "TOOL",    tone: "trace" },
  { id: "book",         x:  720, y: 440, kind: "tool",    title: "book_table",    subtitle: "long-running",      kicker: "TOOL",    tone: "trace" },
  { id: "approval",     x:  920, y: 440, kind: "io",      title: "approval card", subtitle: "send_to_user",      kicker: "HITL",    tone: "accent" },
  { id: "events",       x:  510, y: 540, kind: "io",      title: "event stream",  subtitle: "otel · bq · audit", kicker: "OUT" },
  { id: "response",     x:  110, y: 200, kind: "io",      title: "response",      subtitle: "audio + transcript",kicker: "OUT",     tone: "accent" },
];

export const FLOWS: Flow[] = [
  { id: "u-r",   from: "user",        to: "runner",      arrow: "forward" },
  { id: "r-s",   from: "runner",      to: "session",     tone: "trace", arrow: "both" },
  { id: "r-m",   from: "runner",      to: "memory",      tone: "trace", arrow: "both",    curve: -20 },
  { id: "r-c",   from: "runner",      to: "coordinator", arrow: "forward" },
  { id: "c-p",   from: "coordinator", to: "planner",     arrow: "forward", label: "transfer" },
  { id: "p-srch",from: "planner",     to: "search",      tone: "trace", arrow: "forward", label: "call" },
  { id: "p-book",from: "planner",     to: "book",        tone: "trace", arrow: "forward", label: "call" },
  { id: "b-app", from: "book",        to: "approval",    tone: "accent", arrow: "forward", label: "pending" },
  { id: "app-b", from: "approval",    to: "book",        tone: "accent", arrow: "forward", label: "approved", curve: -40 },
  { id: "p-ev",  from: "planner",     to: "events",      tone: "muted", arrow: "forward" },
  { id: "r-resp",from: "runner",      to: "response",    arrow: "forward", curve: -60 },
];

export interface Beat {
  id: string;
  t: number;           // seconds
  narration: string;
  active?: string[];
  show?: string[];
  flows?: string[];    // flow ids that animate / travel
  code?: { title: string; body: string };
}

export const BEATS: Beat[] = [
  {
    id: "t0",
    t: 0,
    narration: "A user says: \"Book a table for two at Nobu, Saturday.\"",
    show: ["user", "runner"],
    active: ["user"],
  },
  {
    id: "t1",
    t: 2.2,
    narration: "runner.run_live opens a live session. LiveRequestQueue is listening.",
    show: ["runner"],
    active: ["runner"],
    flows: ["u-r"],
    code: {
      title: "server.py",
      body: `async for ev in runner.run_live(
    user_id=uid,
    session_id=sid,
    live_request_queue=queue,
    run_config=cfg):
    yield ev`,
    },
  },
  {
    id: "t2",
    t: 4.4,
    narration: "Session and memory services wake up. State and recall are ready.",
    show: ["session", "memory"],
    active: ["session", "memory"],
    flows: ["r-s", "r-m"],
  },
  {
    id: "t3",
    t: 6.6,
    narration: "The coordinator agent classifies the intent and routes.",
    show: ["coordinator"],
    active: ["coordinator"],
    flows: ["r-c"],
    code: {
      title: "coordinator.py",
      body: `root = LlmAgent(
  name="coordinator",
  model="gemini-2.5-pro",
  sub_agents=[reservations, faq, cancel],
)`,
    },
  },
  {
    id: "t4",
    t: 8.8,
    narration: "Control transfers to the reservations specialist, a SequentialAgent.",
    show: ["planner"],
    active: ["planner"],
    flows: ["c-p"],
  },
  {
    id: "t5",
    t: 11.0,
    narration: "It calls an MCP tool to search available tables.",
    show: ["search"],
    active: ["search"],
    flows: ["p-srch"],
    code: {
      title: "tools",
      body: `MCPToolset(connection_params=StdioServerParameters(
    command="npx",
    args=["-y", "@opentable/mcp-server"]))`,
    },
  },
  {
    id: "t6",
    t: 13.4,
    narration: "Booking is a long-running tool. It opens an approval card and pauses.",
    show: ["book", "approval"],
    active: ["book"],
    flows: ["p-book", "b-app"],
  },
  {
    id: "t7",
    t: 15.8,
    narration: "The user approves. The session resumes with {approved: true}.",
    active: ["approval", "book"],
    flows: ["app-b"],
    code: {
      title: "approval",
      body: `await runner.resume_tool(
  session_id=sid,
  handle=h,
  response={"approved": True})`,
    },
  },
  {
    id: "t8",
    t: 18.2,
    narration: "Every event is streamed out — OpenTelemetry traces, BigQuery audit.",
    show: ["events"],
    active: ["events"],
    flows: ["p-ev"],
  },
  {
    id: "t9",
    t: 20.4,
    narration: "The session writes state. Memory bank extracts the preference for later.",
    active: ["session", "memory"],
    flows: ["r-s", "r-m"],
  },
  {
    id: "t10",
    t: 22.6,
    narration: "The agent replies, aloud, in the user's voice channel.",
    show: ["response"],
    active: ["response"],
    flows: ["r-resp"],
  },
  {
    id: "t11",
    t: 25.0,
    narration: "One request. One session. One event log. Every primitive, once.",
  },
];

export const VIDEO_DURATION = 28;
