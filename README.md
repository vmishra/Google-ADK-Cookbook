# Google ADK Cookbook

> A practitioner's reference for building, orchestrating, and shipping agents
> with Google's Agent Development Kit (ADK).
> Written for engineers and architects who have already tried LangChain,
> LangGraph, or CrewAI and want to know when — and why — to reach for ADK.

---

## What this is

A structured, chapter-style cookbook. Each chapter stands on its own, but
the ordering is deliberate: concepts layer on top of each other the way
they do in a real project.

- Twenty chapters of prose, diagrams, and runnable code.
- Twenty complete example agents under `examples/` — each its own mini-project.
- A catalogue of design patterns and anti-patterns under `patterns/`.
- Cheatsheets for the primitives, imports, and CLI under `cheatsheets/`.
- Comparisons against LangChain, LangGraph, CrewAI, and AutoGen — honest
  about where each wins.

Everything is plain Markdown. The repo compiles to a single static site
with MkDocs Material (`mkdocs serve`) or Docusaurus. You can also read it
straight on GitHub.

There is also a **[presentation/](presentation/)** sub-app — an
interactive, animated exhibit of ADK rendered as living diagrams,
including a *trace-a-request* cinematic that walks one message
through every primitive in the framework.

---

## Who it is for

- **Platform engineers** choosing a framework for a new agent product.
- **Google Cloud architects** handing customers a concrete answer to
  *"what can ADK do that LangGraph can't?"*
- **Senior engineers** migrating from a first-generation agent stack to
  something production-grade.
- **Students and new hires** who want a path from *hello world* to
  multi-agent, long-running, streaming, evaluated, and deployed.

We assume Python fluency. Most examples are Python; where ADK's TypeScript,
Go, or Java paths diverge meaningfully, those are called out.

---

## How to read it

Three passes, in order of depth:

1. **Tour.** Read the introduction (Chapter 0) and the comparison chapter
   (Chapter 17). That is enough to decide whether ADK belongs in your
   toolbox.
2. **Build.** Work through Chapters 1–5 and run `examples/01-hello-agent`
   through `examples/05-loop-agent-refiner`. By the end you will have
   written a multi-agent workflow, a tool with state, and a refinement
   loop.
3. **Operate.** Chapters 11–15 and the patterns directory cover what
   production looks like: observability, evaluation, deployment, safety,
   cost and latency.

---

## Chapter index

| # | Chapter | What it covers |
|---|---|---|
| 00 | [Introduction](docs/00-introduction/) | What ADK is, why it exists, where it fits |
| 01 | [Getting started](docs/01-getting-started/) | Install, first agent, project layout, CLI |
| 02 | [Core concepts](docs/02-core-concepts/) | Agents, tools, sessions, memory, runner, events, callbacks, artifacts |
| 03 | [Agent types](docs/03-agent-types/) | LLM, Sequential, Parallel, Loop, Custom |
| 04 | [Tools](docs/04-tools/) | Function, OpenAPI, MCP, built-in, long-running, agent-as-tool |
| 05 | [Skills](docs/05-skills/) | The Agent Skill spec, progressive disclosure, authoring |
| 06 | [Multimodal & Live](docs/06-multimodal/) | Gemini Live, voice, streaming, vision, bidi |
| 07 | [Computer use](docs/07-computer-use/) | Browser automation with the computer-use model |
| 08 | [Deep research](docs/08-deep-research/) | Planner/researcher/writer patterns, long-horizon work |
| 09 | [Multi-agent systems](docs/09-multi-agent/) | Coordinator, delegation, A2A, federation |
| 10 | [Memory patterns](docs/10-memory-patterns/) | State vs memory, Vertex Memory Bank, compaction |
| 11 | [Observability](docs/11-observability/) | Tracing, logging, the dev UI, OpenTelemetry |
| 12 | [Evaluation](docs/12-evaluation/) | Eval sets, trajectory, rubric metrics, CI gates |
| 13 | [Deployment](docs/13-deployment/) | Agent Engine, Cloud Run, GKE, self-hosted |
| 14 | [Safety](docs/14-safety/) | Guardrails, approval flows, allowlists, red-team |
| 15 | [Cost & latency](docs/15-cost-latency/) | Caching, compression, model selection, batching |
| 16 | [Interop](docs/16-interop/) | MCP, A2A, LangChain/LangGraph/CrewAI bridges |
| 17 | [Comparisons](docs/17-comparisons/) | ADK vs LangChain, LangGraph, CrewAI, AutoGen |
| 18 | [Case studies](docs/18-case-studies/) | Real-world use cases and architectures |
| 19 | [Harness platform](docs/19-harness-platform/) | Using ADK to build agent platforms, harnesses, orchestration runtimes |

---

## Examples

Each folder under `examples/` is a self-contained project with its own
`README.md`, `requirements.txt`, and runnable agent. Order is pedagogical
but you can jump in anywhere.

```
examples/
  01-hello-agent                      LlmAgent + one function tool
  02-tool-calling                     Multi-tool selection, ToolContext
  03-sequential-workflow              Three-step SequentialAgent
  04-parallel-research                Fan-out / fan-in with ParallelAgent
  05-loop-agent-refiner               LoopAgent with stopping condition
  06-memory-backed-assistant          VertexAiMemoryBankService + load_memory
  07-multi-agent-coordinator          Coordinator + sub-agents with transfer
  08-skills-weather                   The Agent Skill spec in practice
  09-computer-use-browser             gemini-2.5-computer-use + Playwright
  10-mcp-integration                  MCPToolset against an MCP server
  11-deep-research                    Planner/researcher/writer with state
  12-voice-assistant-live             run_live() + LiveRequestQueue
  13-vision-analyzer                  Multimodal image reasoning
  14-a2a-federation                   Expose + consume agents over A2A
  15-langchain-bridge                 Wrapping a LangChain tool/chain
  16-crewai-bridge                    CrewAI interop
  17-long-running-job                 Long-running tool + resumable sessions
  18-eval-suite                       Full eval set + pytest integration
  19-cost-optimizer                   Caching, compression, model routing
  20-production-template              The template we would ship on
```

---

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install google-adk
```

Authenticate to Google Cloud once (for Gemini, Vertex services, Agent
Engine):

```bash
gcloud auth application-default login
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
```

That is the full prerequisite for the first eight chapters. Later chapters
add optional dependencies: Playwright for computer use, an MCP server for
Chapter 10, etc. Each example lists only what it needs.

---

## Building the site

Two ways to run the MkDocs site locally.

### Managed via script (recommended)

`docs.sh` at the repo root creates a project-local `.venv`, installs
the pinned dependencies from `requirements.txt` on first run (or when
`requirements.txt` changes), and runs `mkdocs serve` detached with a
PID file so it survives your shell.

```bash
./docs.sh start     # venv + install if needed, serve in background
./docs.sh status    # running? on what URL?
./docs.sh logs      # tail the mkdocs log
./docs.sh stop
./docs.sh restart
./docs.sh build     # one-shot static build into site/
```

Defaults to `http://127.0.0.1:8000`. Override with `MKDOCS_PORT` or
`MKDOCS_HOST`. State lives in `.mkdocs.pid` and `.mkdocs.log`.

### Manual

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve   # local preview on http://127.0.0.1:8000
mkdocs build   # static output under site/
```

The `mkdocs.yml` at the repo root wires up navigation, search, and the
theme. Swap it for Docusaurus or Nextra if you prefer — the Markdown is
framework-agnostic.

### Presentation sub-app

The `presentation/` directory is a separate Vite/React app. Manage it
with the sibling [`presentation.sh`](presentation.sh) script
(`./presentation.sh start|stop|status|logs|restart`) or follow
[`presentation/README.md`](presentation/README.md).

---

## Conventions used in this repo

- Code examples are runnable as-is against a current ADK install. Where
  an example needs a service account or a Vertex Memory Bank, the README
  for that example documents the one-time setup.
- Import paths are pinned to the ADK Python namespace (`google.adk.*`).
  TypeScript, Go, and Java equivalents are noted where they meaningfully
  differ.
- Copy avoids exclamation marks, marketing language, and cheerleader
  phrasing — on the principle that anyone reading this has seen enough
  of those elsewhere.
- Model IDs used in examples are current as of April 2026 (ADK Python
  1.31.1). When a model is in *preview*, the chapter says so and the
  example falls back to a GA model if the preview model is not enabled.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). The cookbook is open to
corrections, new examples, and translations. Keep the editorial voice.

---

## Licence

Apache 2.0. See [`LICENSE`](LICENSE).
