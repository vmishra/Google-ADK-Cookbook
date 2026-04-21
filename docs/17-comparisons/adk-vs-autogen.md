# ADK vs AutoGen

<span class="kicker">ch 17 · page 4 of 4</span>

Microsoft's AutoGen models multi-agent systems as *conversations*:
agents that talk to each other until a goal is reached.

---

## The framing difference

- **AutoGen** is conversation-centric. Agents exchange messages;
  the control flow is "who speaks next".
- **ADK** is composition-centric. Agents are wired into workflow
  agents; control flow is a tree.

Both can build the same systems. The mental model differs.

## Feature matrix

| Axis | AutoGen | ADK |
|---|---|---|
| Agent coordination | GroupChat, SelectSpeaker | Coordinator, workflow agents, A2A |
| State | Conversation history + explicit carryover | `SessionService` |
| Memory | Varies by integration | `MemoryService` (Vertex Memory Bank) |
| Code execution | `UserProxyAgent` with code executor | `AgentEngineSandboxCodeExecutor`, container, local |
| Tools | Function + MCP | Function / OpenAPI / MCP / agent-as-tool |
| Human-in-loop | `UserProxyAgent` | `LongRunningFunctionTool` |
| Voice / live | Via extensions | Native Gemini Live |
| Evaluation | AutoGen Bench | `adk eval` |
| Deployment | DIY | Agent Engine / Cloud Run / GKE |

## What AutoGen is better at

- **Agent-to-agent dialogue research.** Conversation is the first
  primitive; running experiments on speaker selection, hand-off
  patterns, and consensus is the native use case.
- **Code-executing sandboxes for local dev.** The `UserProxyAgent`
  + executor pattern is idiomatic.
- **Microsoft-side integration.** Azure, Semantic Kernel.

## What ADK is better at

- **Production-grade runtime.** Sessions, managed memory,
  evaluation as CLI, deployment as CLI.
- **Voice and real-time.** Not close.
- **Open-protocol federation.** A2A.
- **Vertex-native integrations.**

## When to pick which

- **"I'm researching agent-to-agent coordination patterns."** AutoGen.
- **"I'm shipping to production on GCP."** ADK.
- **"I'm on Azure."** AutoGen or Semantic Kernel.
- **"Multi-cloud with open protocols."** ADK.

## Interop

AutoGen conversations can be wrapped as A2A endpoints. ADK agents
can be called as functions inside AutoGen via a thin client. Neither
path is frictionless; pick one framework per subsystem and federate
across A2A where it matters.

---

## Chapter recap

Four frameworks, four framings, one comparison table repeated.

The pattern: ADK wins on *production and platform* axes (sessions,
memory, eval, deployment, voice, federation). The competitors win
on *narrow ergonomic* axes (concise chains, explicit state, role
modelling, conversation dynamics). Pick based on which axes dominate
the project.

Next: [Chapter 18 — Case studies](../18-case-studies/index.md).
