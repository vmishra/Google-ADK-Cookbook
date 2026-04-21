# ADK vs LangGraph

<span class="kicker">ch 17 · page 2 of 4</span>

LangGraph is the closest competitor. Both frameworks can build the
same systems; they differ on which primitive is first-class.

---

## The framing difference

- **LangGraph** is a graph of nodes with an explicit state schema.
  You declare the state type, nodes mutate it, edges decide which
  node runs next.
- **ADK** is a tree of agents with a dict-shaped session state.
  Agents compose, tools run inside them, events form the log.

Neither is better in the abstract. They are better for different
things.

## Feature matrix

| Axis | LangGraph | ADK |
|---|---|---|
| State typing | Explicit TypedDict / pydantic | Dict with prefix semantics |
| Branching | Conditional edges | `transfer_to_agent`, callbacks |
| Loops | Edges back to the same node | `LoopAgent` |
| Parallel | Superstep with multiple active nodes | `ParallelAgent` |
| Persistence | Checkpointer interface | `SessionService` |
| Long-term memory | DIY | `MemoryService` (Vertex Memory Bank) |
| Multi-agent across processes | LangGraph Platform | A2A (open protocol) |
| Voice / live audio | Not built in | `run_live` + Gemini Live |
| Computer use | Community tools | `ComputerUseToolset` |
| Evaluation | LangSmith | `adk eval` |
| Managed runtime | LangGraph Platform (paid) | Agent Engine, Cloud Run, GKE |

## What LangGraph is better at

- **Explicit state schemas.** If your team thinks in terms of a
  state type evolving over time, LangGraph's explicit schema is
  cleaner than ADK's dict.
- **Complex conditional branching.** Edges are a first-class way to
  encode "if X go to node A, else B, else C". ADK achieves this via
  callbacks and `transfer_to_agent`; it is there but less visual.
- **Already-integrated LangSmith eval.** If LangSmith is a hard
  requirement, LangGraph is the path.

## What ADK is better at

- **Multi-agent systems that cross process boundaries.** A2A is
  open; LangGraph's cross-process story is primarily LangGraph
  Platform.
- **Voice and real-time.** Not close.
- **Open-protocol interop.** MCP, A2A, OpenTelemetry. LangGraph
  plays in this space but is not built around it.
- **Managed deployment on GCP.** Agent Engine exists; there is no
  first-party equivalent.

## When to pick which

- **"My workflow is a state machine with typed transitions."** LangGraph.
- **"My system is many agents that should federate."** ADK.
- **"I need voice, computer use, or multimodal."** ADK.
- **"I am on LangSmith and staying there."** LangGraph.
- **"I am on GCP."** ADK.

## Interop

You can call a LangGraph workflow from ADK over A2A and vice versa.
In practice, teams pick one for each project; cross-system is for
federation across teams.
