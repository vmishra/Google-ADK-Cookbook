import type { ComponentType } from "react";
import type { Slide } from "@/state/useSlideStore";

import { OpeningScene } from "./00-opening";
import { OneAgentScene } from "./01-one-agent";
import { RunnerScene } from "./02-runner";
import { SessionsScene } from "./03-sessions";
import { MemoryScene } from "./04-memory";
import { WorkflowScene } from "./05-workflow";
import { ParallelScene } from "./06-parallel";
import { LoopScene } from "./07-loop";
import { SkillsScene } from "./08-skills";
import { MultimodalScene } from "./09-multimodal";
import { ComputerUseScene } from "./10-computer-use";
import { A2AScene } from "./11-a2a";
import { HarnessScene } from "./12-harness";
import { ClosingScene } from "./13-closing";

export const slides: Array<Slide & { Scene: ComponentType }> = [
  { id: "opening",   chapter: "00 · Prologue",   kicker: "prologue",   title: "What is ADK, precisely.",              Scene: OpeningScene },
  { id: "one",       chapter: "01 · Primitive",  kicker: "one agent",  title: "One agent, one tool, one turn.",       Scene: OneAgentScene },
  { id: "runner",    chapter: "02 · Runtime",    kicker: "the loop",   title: "The runner is where everything happens.", Scene: RunnerScene },
  { id: "sessions",  chapter: "03 · State",      kicker: "sessions",   title: "State has scope. Scope has prefixes.", Scene: SessionsScene },
  { id: "memory",    chapter: "04 · Memory",     kicker: "recall",     title: "Memory is not history.",               Scene: MemoryScene },
  { id: "workflow",  chapter: "05 · Workflow",   kicker: "sequential", title: "Agents compose through one interface.",Scene: WorkflowScene },
  { id: "parallel",  chapter: "06 · Fan-out",    kicker: "parallel",   title: "Three researchers, one answer.",       Scene: ParallelScene },
  { id: "loop",      chapter: "07 · Refinement", kicker: "loop",       title: "Draft, critique, repeat.",             Scene: LoopScene },
  { id: "skills",    chapter: "08 · Capability", kicker: "skills · mcp",title: "The surface area the model sees.",   Scene: SkillsScene },
  { id: "multimodal",chapter: "09 · Live",       kicker: "bidi",       title: "Voice is the same agent.",             Scene: MultimodalScene },
  { id: "computer",  chapter: "10 · Computer use",kicker:"screen → action",title:"The model sees pixels. Acts.",      Scene: ComputerUseScene },
  { id: "a2a",       chapter: "11 · Federation", kicker: "a2a",        title: "Agents across processes, teams.",      Scene: A2AScene },
  { id: "harness",   chapter: "12 · Platform",   kicker: "harness",    title: "The runtime that runs other runtimes.",Scene: HarnessScene },
  { id: "closing",   chapter: "13 · Epilogue",   kicker: "the whole",  title: "Everything you just saw, at once.",    Scene: ClosingScene },
];
