# Chapter 3 — Agent types

<span class="kicker">chapter 03 · worked examples</span>

Chapter 2 introduced the five agent types as classes. This chapter
builds a full example for each, end-to-end, runnable.

```mermaid
flowchart LR
  A[LlmAgent] --> B[SequentialAgent]
  B --> C[ParallelAgent]
  C --> D[LoopAgent]
  D --> E[CustomAgent]
  style A fill:#c9a45a,color:#0f0f12
```

| Page | Builds |
|---|---|
| [LLM agent](llm-agent.md) | A single `LlmAgent` with structured output. |
| [Sequential agent](sequential-agent.md) | Planner → researcher → writer. |
| [Parallel agent](parallel-agent.md) | Three search backends in parallel, merged. |
| [Loop agent](loop-agent.md) | A critic that refines a draft until satisfied. |
| [Custom agent](custom-agent.md) | A round-robin agent from `BaseAgent`. |

Every example in this chapter corresponds to a runnable folder in
[`examples/`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples).
