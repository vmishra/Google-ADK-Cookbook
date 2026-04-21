# Delegation

<span class="kicker">ch 09 · page 2 of 3</span>

`AgentTool` wraps an agent as a tool. The parent calls it, the child
runs to completion, and the parent receives a single result. This
gives you hierarchical delegation with black-box semantics — the
parent does not share state with the child.

---

## Why delegation, not sub-agents

Coordinator routing (`sub_agents`) gives the sub-agent direct access
to the user and shared state. That is what you want for specialists
who need to see the conversation context.

Delegation (`AgentTool`) gives you something different:

- The child runs with a *scoped* context — only what the parent
  passes in.
- The child returns a single output, not a live response stream.
- The parent can wrap, reject, or reshape the output before replying.

Use delegation when the child is a reusable capability, not a
collaborator.

## Code

```python
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool


summariser = LlmAgent(
    name="summariser",
    model="gemini-2.5-flash",
    description="Summarises a passage into one paragraph.",
    instruction="Summarise the input passage into one paragraph of <=80 words.",
)

fact_checker = LlmAgent(
    name="fact_checker",
    model="gemini-2.5-pro",
    description="Verifies factual claims against web sources.",
    instruction="Verify each claim. Return a list of claim/verdict/source tuples.",
    tools=[google_search],
)


root_agent = LlmAgent(
    name="editor",
    model="gemini-2.5-pro",
    instruction=(
        "You are an editor. Given a draft, first call summariser. "
        "Then call fact_checker on the summary. Return a clean final."),
    tools=[AgentTool(agent=summariser), AgentTool(agent=fact_checker)],
)
```

## Passing arguments

`AgentTool` accepts `input_key` and `output_key` to control how the
input is passed and where the output is stored:

```python
AgentTool(agent=summariser, input_key="draft", output_key="summary")
```

The parent writes `state["draft"]`, the tool runs the child with
that text, and the child's final output lands in `state["summary"]`.

## Grounding metadata

If the wrapped agent uses `google_search`, its grounding metadata
propagates up. The parent sees a tool result with `grounding_metadata`
attached — you can surface citations in the parent's reply.

See `contributing/samples/agent_tool_with_grounding_metadata`.

---

## Delegation anti-patterns

- **Using delegation when the child should speak directly.** Leads
  to a robotic "Here is what my subordinate said:" wrapper.
- **Stacking delegations four deep.** Each level adds a round-trip.
  If the depth is functional, that is fine; if it is incidental,
  flatten.
- **Letting the child read `user:` state it should not see.**
  Delegation scopes state by default — do not punch through.

---

## See also

- [`examples/07-multi-agent-coordinator`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/07-multi-agent-coordinator).
