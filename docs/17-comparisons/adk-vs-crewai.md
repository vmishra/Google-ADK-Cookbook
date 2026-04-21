# ADK vs CrewAI

<span class="kicker">ch 17 · page 3 of 4</span>

CrewAI models agents as *roles* with tasks, and crews as
*processes* (sequential or hierarchical) that coordinate them.

---

## The framing difference

- **CrewAI** is a task-and-role orchestration framework. Agents are
  defined by role and goal; tasks are assigned; processes decide
  which task runs when.
- **ADK** is an agent platform. Agents are defined by model +
  instruction + tools; composition is through sub_agents and
  workflow agents.

## Feature matrix

| Axis | CrewAI | ADK |
|---|---|---|
| Agent definition | Role + goal + backstory | Instruction + tools |
| Coordination | Process (Sequential, Hierarchical, Consensual) | Workflow agents, coordinator pattern |
| State | In-process, per-crew | `SessionService` (three backends) |
| Memory | Vector store-backed | `MemoryService` (Vertex Memory Bank) |
| Tools | Large community library | Function / OpenAPI / MCP / agent-as-tool |
| Multimodal | Via LiteLLM-style backends | Native Gemini Live |
| Computer use | Via community tools | Native `ComputerUseToolset` |
| Deployment | DIY | Agent Engine / Cloud Run / GKE |
| Evaluation | DIY | `adk eval` |

## What CrewAI is better at

- **Rapid modelling of role-based teams.** A three-agent "writer,
  editor, fact-checker" crew is three short class instantiations.
- **Role/backstory prompting conventions.** CrewAI encodes a
  particular prompt pattern that works well for creative agent
  tasks.
- **Community recipes for agent-as-character systems.** Heavier on
  persona, role-play-style orchestration.

## What ADK is better at

- **Production lifetime.** Sessions, memory, eval, deployment are
  framework-owned.
- **Voice and live audio.** Not close.
- **Open protocol federation.** A2A.
- **Vertex and Gemini native features.** Memory Bank, computer use,
  live audio, managed runtime.

## Interop

CrewAI crew exposed as an A2A endpoint becomes an ADK
`RemoteA2aAgent`. CrewAI tools can be wrapped with `CrewaiTool`
(see `crewai_tool_kwargs` sample). The other direction is harder —
CrewAI does not have native A2A client support as of April 2026,
so you consume ADK agents as plain HTTP tools.

## When to pick which

- **"I want a three-agent creative pipeline fast."** CrewAI.
- **"I need production deployment and eval."** ADK.
- **"I need voice, computer use, or federation."** ADK.
- **"I want to mix."** Use CrewAI for the narrow creative crew and
  ADK as the orchestration runtime, over A2A.
