# Planner / researcher / writer

<span class="kicker">ch 08 · page 1 of 1</span>

The canonical deep-research architecture. Three specialised agents,
connected by session state, wrapped in a LoopAgent for refinement.

---

## Why three agents and not one

A single `LlmAgent` with web search works for shallow questions.
Deep research is different: it needs a *plan* that survives
individual failed searches, *many* retrieval attempts across
backends, and *synthesis* that reasons over everything gathered —
not just the last tool result.

Splitting the roles gives you:

- A planner you can run on `gemini-3.1-pro` while the researchers
  run on Flash. Plans benefit from reasoning; bulk searching does
  not.
- Independent retry and refinement. The LoopAgent can discard a bad
  plan without discarding the searches already done.
- Evaluation per step — you can rate the plan, the notes, and the
  final report separately.

## Full code

```python
from pydantic import BaseModel
from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent, LoopAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import google_search
from google.adk.tools.load_memory_tool import load_memory_tool


class Plan(BaseModel):
    steps: list[str]
    expected_outcome: str


planner = LlmAgent(
    name="planner", model="gemini-3.1-pro",
    instruction=(
        "You are a research planner. Break the user's question into "
        "3-6 concrete retrieval steps. Each step should be directly "
        "search-engine-able. Prefer recent sources."),
    output_schema=Plan, output_key="plan",
)


web = LlmAgent(
    name="web_researcher", model="gemini-3.1-flash",
    instruction=(
        "Execute every step in state['plan'].steps using google_search. "
        "Write 3-5 bullets per step to state['web_notes']."),
    tools=[google_search], output_key="web_notes",
)

mem = LlmAgent(
    name="memory_researcher", model="gemini-3.1-flash",
    instruction=(
        "Search long-term memory for any prior findings on the same topic. "
        "Write to state['mem_notes']. Skip if none found."),
    tools=[load_memory_tool], output_key="mem_notes",
)

fan_out = ParallelAgent(name="fan_out", sub_agents=[web, mem])


def stop_if_enough(cc: CallbackContext):
    notes = (cc.state.get("web_notes", "") or "")
    if cc.state.get("coverage_score", 0) >= 0.8 or len(notes) > 3500:
        cc.event_actions.escalate = True


synthesiser = LlmAgent(
    name="synthesiser", model="gemini-3.1-pro",
    instruction=(
        "Given state['plan'], state['web_notes'], state['mem_notes'], "
        "rate coverage 0-1 in state['coverage_score']. If below 0.8, "
        "revise state['plan'] with additional steps. Otherwise stop."),
    after_agent_callback=stop_if_enough,
    output_key="synthesis",
)


loop = LoopAgent(
    name="research_loop",
    sub_agent=SequentialAgent(name="one_pass",
        sub_agents=[fan_out, synthesiser]),
    max_iterations=3,
)


writer = LlmAgent(
    name="writer", model="gemini-3.1-pro",
    instruction=(
        "Write a 400-word report answering the user question using "
        "state['web_notes'] and state['mem_notes']. Cite inline as [n]. "
        "Include a Sources list at the end."),
)


root_agent = SequentialAgent(
    name="deep_research",
    sub_agents=[planner, loop, writer],
)
```

## The coverage score

Rather than bounding on iteration count alone, the synthesiser
produces a coverage score the loop reads. This is a general
pattern: **use a computed metric as the stopping signal, not just
"did the model say it is done".**

## Saving the finished session to memory

So the next question benefits from this research:

```python
async def save_research_memory(cc):
    await cc._invocation_context.memory_service.add_session_to_memory(
        cc._invocation_context.session)

root_agent = SequentialAgent(
    name="deep_research",
    sub_agents=[planner, loop, writer],
    after_agent_callback=save_research_memory,
)
```

With `VertexAiMemoryBankService`, the memory extractor summarises
the session into reusable facts — the next similar query starts
warmer.

## Tuning knobs

- **`max_iterations`** on the loop — 2-4 is normal, 5+ rarely wins.
- **Coverage threshold** — 0.7 to 0.85 is a good band.
- **Model split** — planner on Pro, researchers on Flash, synthesiser
  on Pro, writer on Pro. Flash for anything bulk, Pro where the
  reasoning cost matters.
- **Web vs KB** — add `kb_search`, `sql_search`, or `VertexAiRagRetrieval`
  as parallel siblings of `web`.

## Evaluating a deep researcher

- Trajectory eval on the plan — is the list of steps reasonable?
- Rubric eval on the final report — accuracy, completeness, tone.
- Hallucination check against the gathered notes — every claim in
  the report should trace to a note.

Chapter 12 builds this eval suite.

---

## See also

- [`examples/11-deep-research`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/11-deep-research)
- `adk-samples/academic-research`, `deep-search`, `fomc-research` for
  three more production deep-research shapes.
