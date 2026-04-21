# Google ADK Cookbook

<span class="kicker">a practitioner's reference · april 2026</span>

A chapter-style reference for building, orchestrating, and shipping agents
with Google's Agent Development Kit. Written for engineers who have already
tried LangChain, LangGraph, or CrewAI and want a straight answer on what
ADK does differently.

---

## What you will find here

```mermaid
flowchart LR
  A[Start] --> B[Introduction]
  B --> C[Getting started]
  C --> D[Core concepts]
  D --> E[Agent types]
  E --> F[Tools & Skills]
  F --> G[Multimodal & Live]
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
  Q --> R[Ship]
  style A fill:#c9a45a,color:#0f0f12
  style R fill:#c9a45a,color:#0f0f12
```

Eighteen chapters, twenty runnable examples, a patterns library, and
honest comparisons against the other frameworks you will have seen.

## The 30-second pitch

ADK is the agent framework Google uses to build the agents it ships
itself — Gemini Enterprise, the computer-use agent, Vertex AI Agent
Engine's managed runtime, and the agents embedded in Workspace. The same
code path you write in this cookbook is the code path those products run
on. That lineage is the entire reason to consider it.

Three ideas make ADK different from the chain-and-graph frameworks that
came before it:

1. **Agents are first-class, not graph nodes.** An `LlmAgent`,
   `SequentialAgent`, `ParallelAgent`, and `LoopAgent` all implement the
   same `BaseAgent` interface. You compose agents, not tasks, and the
   orchestration primitives read the way you would draw the architecture
   on a whiteboard.
2. **Sessions, memory, and artifacts are platform concerns, not
   application concerns.** You do not re-implement chat history, vector
   search, or file storage in every project. You pick a service
   (`InMemory`, `VertexAi`, or your own implementation) and the runtime
   wires it in.
3. **Multimodal and computer use are built in.** Live voice, bidi audio,
   vision, and the `gemini-2.5-computer-use` model are part of the
   toolbox the framework is designed around — not glued on.

## How to navigate

- **Reading cover to cover.** Chapters 0 through 18 in order. Roughly a
  weekend of reading; a week if you run every example.
- **Picking a topic.** Use the sidebar. Every chapter has its own index
  page with a one-paragraph summary and a jump list.
- **Pattern lookup.** [Patterns](patterns/index.md) and
  [Cheatsheets](cheatsheets/index.md) are terse — they assume you have
  read the corresponding chapter.

## Authoritative sources

This cookbook references the official docs everywhere it can:

- [`adk.dev`](https://adk.dev/) — the canonical documentation site
- [`github.com/google/adk-python`](https://github.com/google/adk-python)
- [`github.com/google/adk-samples`](https://github.com/google/adk-samples)
- [`ai.google.dev/gemini-api/docs`](https://ai.google.dev/gemini-api/docs)
- [`cloud.google.com/vertex-ai/generative-ai/docs/agent-engine`](https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine)

When a page on this cookbook makes a claim that is not obvious from
first principles, it either links to a section of the official docs or
quotes the source directly.

## Versions covered

| Layer | Version | Notes |
|---|---|---|
| ADK Python | 1.31.1 | Released 2026-04-21. Examples target 1.30+. |
| ADK TypeScript | 1.x | Called out where the Python path diverges. |
| ADK Go / Java | 1.0+ | Referenced in Chapter 16 (Interop). |
| Gemini default | `gemini-2.5-flash` | The cost–latency balance most chapters want. |
| Gemini reasoning | `gemini-2.5-pro` | Deep research, planning, hard tool-use. |
| Gemini computer-use | `gemini-2.5-computer-use-preview-10-2025` | Preview. Chapter 7. |
| Gemini live (Vertex) | `gemini-live-2.5-flash-native-audio` | Chapter 6. |
| Gemini live (API) | `gemini-2.5-flash-native-audio-preview-12-2025` | Chapter 6. |

If a model or API has moved by the time you read this, treat the chapter
text as the authoritative statement of *intent* and consult the linked
doc for the current name.

---

Start with [**Chapter 0 — Introduction**](00-introduction/index.md).
