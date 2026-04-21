# Chapter 2 — Core concepts

<span class="kicker">chapter 02 · the primitives, one page each</span>

Eight pages, one primitive per page. Read in order the first time;
bookmark for reference after.

---

## The lattice

```mermaid
flowchart TB
  subgraph Runtime[Runtime]
    Runner --> Session
    Runner --> Memory
    Runner --> Artifact
    Runner --> Credential[Credentials]
  end
  subgraph Behaviour[Behaviour]
    Agent --> Tool
    Agent --> Callback
    Agent --> Subagent[sub-agents]
  end
  Runtime --> Events
  Behaviour --> Events
  Events --> Log[(Event log)]
  Log --> Replay[Replay / Rewind]
  Log --> Eval[Evaluation]
  Log --> Trace[Tracing]
  style Runner fill:#c9a45a,color:#0f0f12
  style Events fill:#c9a45a,color:#0f0f12
```

Every page in this chapter expands one box of the lattice. The event
log is the shared bus — if you learn only one mental model from this
chapter, make it that one.

## Page index

| Page | Primitive | Why read it |
|---|---|---|
| [Agents](agents.md) | `LlmAgent`, workflow agents, `BaseAgent` | Composition is the whole framework |
| [Tools](tools.md) | function, MCP, OpenAPI, long-running, agent-as-tool | How behaviour extends beyond the model |
| [Sessions](sessions.md) | `Session`, `State`, `SessionService` | Conversation memory and prefix conventions |
| [Memory](memory.md) | `MemoryService`, `load_memory`, Vertex Memory Bank | Cross-session knowledge |
| [Runner](runner.md) | `Runner`, `InMemoryRunner`, service wiring | The drive loop |
| [Events](events.md) | `Event`, `EventActions`, `state_delta` | The structured trace |
| [Callbacks](callbacks.md) | `before_*`/`after_*` hooks | Safety, caching, policy |
| [Artifacts](artifacts.md) | `ArtifactService`, binary payloads | Files, images, large tool outputs |

After this chapter, [Chapter 3 — Agent types](../03-agent-types/index.md)
puts the composition primitives to work.
