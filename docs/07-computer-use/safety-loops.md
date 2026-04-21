# Safety loops

<span class="kicker">ch 07 · page 2 of 2</span>

A browser-using agent can do real things. An approval-less version
is a production liability. This page covers the three layers of
safety you almost always want: domain allowlists, action gates, and
a human approval card for irreversible actions.

---

## Layer 1 — domain allowlist

Block navigation to anything outside the allowlist.

```python
from google.adk.tools.computer_use.computer_use_toolset import ComputerUseToolset

ALLOWED = {"news.ycombinator.com", "wikipedia.org", "docs.google.com"}


def before_tool(tool, args, ctx):
    if tool.name == "navigate":
        host = urlparse(args["url"]).hostname or ""
        if not any(host.endswith(d) for d in ALLOWED):
            return {"ok": False, "reason": f"domain not allowed: {host}"}


root_agent = Agent(
    model="gemini-2.5-computer-use-preview-10-2025",
    ...,
    tools=[ComputerUseToolset(computer=PlaywrightComputer(...))],
    before_tool_callback=before_tool,
)
```

## Layer 2 — action gate

Block typing secrets, submitting to unknown endpoints, clicking
"delete" buttons without a second confirmation.

```python
DESTRUCTIVE_KEYWORDS = {"delete", "deactivate", "cancel subscription",
                        "remove account", "wipe"}

def before_tool(tool, args, ctx):
    if tool.name == "click":
        # Read the screenshot's last OCR'd text (stored by the toolset).
        target_text = ctx.state.get("temp:last_click_target", "").lower()
        if any(kw in target_text for kw in DESTRUCTIVE_KEYWORDS):
            if not ctx.state.get("approved_destructive"):
                return {"ok": False, "reason": "destructive click needs approval"}
    return None
```

## Layer 3 — human approval card

For actions the model itself decides need approval, pair a
`LongRunningFunctionTool` with the agent. The agent pauses, shows a
card in the UI, resumes when the user approves.

```python
from google.adk.tools.long_running_tool import LongRunningFunctionTool


def request_approval(description: str) -> dict:
    """Pause and ask the user to approve before proceeding.

    The user sees a card with `description` and Approve / Decline
    buttons. The session resumes with the decision.
    """
    # A real implementation sends a Slack / email / UI notification.
    return {"pending": True, "handle": enqueue_approval(description)}


root_agent = Agent(
    model="gemini-2.5-computer-use-preview-10-2025",
    tools=[
        ComputerUseToolset(computer=PlaywrightComputer(...)),
        LongRunningFunctionTool(func=request_approval),
    ],
    instruction="""
You operate a browser. Before:
  - submitting a form that spends money
  - sending a message on someone's behalf
  - deleting or archiving data
call request_approval with a one-line description of the action.
Proceed only after the approval returns {approved: true}.
""",
)
```

## Sandboxing

Run the browser in a sandbox. The `sandbox_computer_use` sample
uses a containerised Playwright. For higher isolation, use GKE
Agent Sandbox (see `gke_agent_sandbox` sample) or a VM per session.

## Session scoping

Never share a browser profile across users. The
`profile_name="browser_profile_for_adk"` directory retains cookies,
localStorage, and credentials — treat it as a session-scoped
directory keyed by `session_id`.

## Logging for audit

Turn on action logging in the toolset so every action is in the
event log with the screenshot that triggered it:

```python
ComputerUseToolset(
    computer=PlaywrightComputer(...),
    log_screenshots=True,
    log_actions=True,
)
```

The event log then becomes an auditable record of what the agent
saw and what it did. Combine with `VertexAiSessionService` and a
retention policy sufficient for your compliance needs.

---

## Chapter recap

Computer use is the most direct demonstration of the
"agent-as-capability" thesis. The safety layers above are not
optional — they are the line between a useful agent and an
unsupervised one.

Next: [Chapter 8 — Deep research](../08-deep-research/index.md).
