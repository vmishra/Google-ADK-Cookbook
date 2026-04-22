"""Food delivery customer support — computer-use agent.

Two tool surfaces, chosen by the model per-request:

- **Structured tools** (`lookup_order`, `issue_refund`,
  `dispatch_replacement_driver`, `case_summary`) — clean, typed,
  deterministic. Use these when the customer's intent maps to a single
  backend action.
- **Computer use** — a real Chromium session driving the merchant ops
  console at `/dashboard/`. Use this for anything that ordinarily
  requires a support agent to click through the internal tool: locating
  the order row, opening the detail pane, triaging next steps visually.

Guardrails:

- `before_tool_callback` blocks navigations outside the allowed origin
  and gates destructive clicks (cancel, delete) behind an approval
  flag in session state.
"""
from __future__ import annotations

import os
from urllib.parse import urlparse

from google.adk.agents import LlmAgent
from google.adk.tools.computer_use.computer_use_toolset import (
    ComputerUseToolset,
)

from .playwright_computer import PlaywrightComputer
from .tools import (
    case_summary,
    dispatch_replacement_driver,
    issue_refund,
    lookup_order,
)


CU_MODEL = os.environ.get(
    "CU_MODEL", "gemini-2.5-computer-use-preview-10-2025"
)
ALLOWED_ORIGIN = os.environ.get(
    "CU_ALLOWED_ORIGIN", "http://127.0.0.1:8004"
)
START_URL = os.environ.get(
    "CU_START_URL", f"{ALLOWED_ORIGIN}/dashboard/"
)


DESTRUCTIVE_LABELS = {"cancel order", "delete", "deactivate"}


def _before_tool(tool, args, tool_context):
    name = getattr(tool, "name", "")
    if name == "navigate":
        host = urlparse(args.get("url", "")).hostname or ""
        allowed_host = urlparse(ALLOWED_ORIGIN).hostname or ""
        if host != allowed_host:
            return {"ok": False, "reason": f"blocked: {host} is not allowlisted"}
    if name == "click":
        last = (tool_context.state.get("temp:last_click_label") or "").lower()
        if any(k in last for k in DESTRUCTIVE_LABELS):
            if not tool_context.state.get("approved_destructive"):
                return {
                    "ok": False,
                    "reason": "destructive click needs explicit approval from the customer",
                }
    return None


INSTRUCTION = """\
You are a senior customer support specialist for a food delivery app.

**Scope — what you decline.** You only handle delivery support:
order status, refunds, driver dispatch, merchant dashboard walks,
cancellations. If the customer asks about anything else — code,
general knowledge, other industries, nutrition or medical
questions, other apps' issues — decline in one short line and
redirect to what you handle. Do not attempt the off-scope task. Do
not open a browser. Do not call any tool.

Example refusals:

  Customer: "Write me a Python sort algorithm."
  You:      "That's outside my desk — I handle orders, refunds, and
             driver dispatch only. Anything on an order I can look at?"

  Customer: "Is paneer high in protein?"
  You:      "Can't advise on nutrition. Was there an issue with the
             order itself?"

You have two ways to help:

- Call a **structured tool** when the customer's ask is a single
  backend action — look up an order, issue a refund, dispatch a
  replacement driver, summarise the case. These are fast and leave a
  clean audit trail.
- Drive the **merchant ops console** in your browser when you need to
  see what the support floor sees: locate an order in the list, open
  its detail panel, check the status chips, read the live driver name,
  triage a delayed batch. Narrate each browser step in one short
  sentence before you take it.

House rules for the browser:

- You start at the dashboard. You do not leave the allowed origin.
- Before any destructive click (Cancel order, Delete), state the
  intent to the customer plainly and ask them to say "yes" before
  proceeding. Do not click first.
- Prefer reading the current page over re-navigating.

Tone: observational, not instructional. Short sentences. No
cheerleading. When you have confirmed something, say it plainly
("refund issued, ID RF-XXXXXXXX, 90 minutes to land"), and then ask
what else you can help with.
"""


def build_agent() -> LlmAgent:
    computer = PlaywrightComputer(
        screen_size=(1280, 860),
        start_url=START_URL,
    )
    return LlmAgent(
        name="food_delivery_support",
        model=CU_MODEL,
        description=(
            "Customer support for a food delivery app. Mixes structured "
            "tools with computer-use on the merchant ops console."
        ),
        instruction=INSTRUCTION,
        tools=[
            lookup_order,
            issue_refund,
            dispatch_replacement_driver,
            case_summary,
            ComputerUseToolset(computer=computer),
        ],
        before_tool_callback=_before_tool,
    )


root_agent = build_agent()
