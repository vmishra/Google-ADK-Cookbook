---
title: Google ADK Cookbook
hide:
  - navigation
  - toc
---

<div class="adk-hero" markdown="0">
  <div class="adk-hero__kicker">A practitioner's reference · April 2026</div>
  <h1 class="adk-hero__title">
    Google&nbsp;ADK <span class="accent">Cookbook</span>
  </h1>
  <p class="adk-hero__sub">
    Build, orchestrate, and ship agents with Google's Agent Development
    Kit — written for engineers who have already tried LangChain,
    LangGraph, or CrewAI and want to know what ADK does differently.
  </p>
  <div class="adk-hero__rule"></div>
  <div class="adk-hero__capabilities">
    <span>Agents</span>
    <span>Tools</span>
    <span>Skills</span>
    <span>Live voice</span>
    <span>Computer use</span>
    <span>A2A</span>
  </div>
  <a href="00-introduction/" class="adk-hero__cta">Begin with Chapter 0 →</a>
  <div class="adk-hero__meta">
    <span>ADK&nbsp;Python <b>1.31.1</b></span>
    <span>Gemini <b>2.5 · Flash · Pro · Live · Computer-use</b></span>
    <span><b>20</b> runnable examples</span>
  </div>
</div>

## Start here

<div class="adk-grid" markdown="0">
  <a class="adk-card" href="00-introduction/">
    <div class="adk-card__kicker">Chapter 00</div>
    <div class="adk-card__title">Introduction</div>
    <p class="adk-card__body">
      What ADK is, structurally. Why it was built. When to pick it
      versus LangChain, LangGraph, CrewAI, or AutoGen.
    </p>
  </a>
  <a class="adk-card" href="01-getting-started/">
    <div class="adk-card__kicker">Chapter 01</div>
    <div class="adk-card__title">Getting started</div>
    <p class="adk-card__body">
      Install, authenticate, build a weather agent three ways: script,
      dev UI, FastAPI. Fifteen minutes.
    </p>
  </a>
  <a class="adk-card" href="02-core-concepts/">
    <div class="adk-card__kicker">Chapter 02</div>
    <div class="adk-card__title">Core concepts</div>
    <p class="adk-card__body">
      The ten primitives — one page each — plus the runtime diagram
      that is the most useful picture in the cookbook.
    </p>
  </a>
  <a class="adk-card" href="19-harness-platform/">
    <div class="adk-card__kicker">Chapter 19</div>
    <div class="adk-card__title">ADK as a harness platform</div>
    <p class="adk-card__body">
      For readers building the thing that runs other agents. A
      reference architecture, a plugin system, a worked coding-
      assistant harness.
    </p>
  </a>
</div>

## The chapters, at a glance

```mermaid
flowchart LR
  A[Start] --> B[Introduction]
  B --> C[Getting started]
  C --> D[Core concepts]
  D --> E[Agent types]
  E --> F[Tools &amp; Skills]
  F --> G[Multimodal &amp; Live]
  G --> H[Computer use]
  H --> I[Deep research]
  I --> J[Multi-agent]
  J --> K[Memory]
  K --> L[Observability]
  L --> M[Evaluation]
  M --> N[Deployment]
  N --> O[Safety · Cost · Interop]
  O --> P[Comparisons]
  P --> Q[Case studies]
  Q --> R[Harness platform]
  R --> S[Ship]
  style A fill:#c9a45a,color:#0f0f12
  style S fill:#c9a45a,color:#0f0f12
```

Nineteen chapters, twenty runnable examples, a patterns library,
and honest comparisons against the other frameworks you will have
seen.

## The one-paragraph pitch

ADK is the agent framework Google uses to build the agents it
ships itself — Gemini Enterprise, the computer-use agent, Vertex AI
Agent Engine's managed runtime, agents embedded in Workspace. The
same code path you write in this cookbook is the code path those
products run on. Three ideas make it different from the
chain-and-graph frameworks that came before:

1. **Agents are first-class, not graph nodes.** An `LlmAgent`,
   `SequentialAgent`, `ParallelAgent`, and `LoopAgent` all implement
   the same `BaseAgent` interface. You compose agents, not tasks.
2. **Sessions, memory, and artifacts are platform concerns.** You
   do not re-implement chat history, vector search, or file storage
   in every project. You pick a service and the runtime wires it in.
3. **Multimodal, live voice, and computer use are built in.**
   Gemini Live, `run_live()`, and the `gemini-2.5-computer-use`
   model are first-class — not bolted on.

## Read order

Three passes, by depth:

1. **Tour.** [Chapter 0](00-introduction/) and
   [Chapter 17](17-comparisons/). An hour. Enough to decide.
2. **Build.** Chapters 1 – 5 plus the first five examples. A
   weekend. By the end you have a multi-agent workflow, a tool with
   state, and a refinement loop.
3. **Operate.** Chapters 11 – 15 and the
   [patterns](patterns/) directory. Another weekend. This is where
   production lives.

## Versions

| Layer | Version | Notes |
|---|---|---|
| ADK Python | 1.31.1 | Released 2026-04-21. |
| Gemini default | `gemini-2.5-flash` | The cost–latency balance most chapters want. |
| Gemini reasoning | `gemini-2.5-pro` | Deep research, planning, hard tool-use. |
| Gemini computer-use | `gemini-2.5-computer-use-preview-10-2025` | Preview. Chapter 7. |
| Gemini live (Vertex) | `gemini-live-2.5-flash-native-audio` | Chapter 6. |
| Gemini live (API) | `gemini-2.5-flash-native-audio-preview-12-2025` | Chapter 6. |

## Source code

All chapters cite the official docs and the Python SDK source.

- [adk.dev](https://adk.dev/) — canonical documentation.
- [github.com/google/adk-python](https://github.com/google/adk-python)
  — reference SDK (1.31.1).
- [github.com/google/adk-samples](https://github.com/google/adk-samples)
  — deployable reference agents.
