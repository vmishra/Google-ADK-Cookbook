"""Refund agent with human-approval via LongRunningFunctionTool."""
import uuid

from google.adk.agents import LlmAgent
from google.adk.tools.long_running_tool import LongRunningFunctionTool
from google.adk.tools.tool_context import ToolContext


# In-process approval queue for demo purposes.
# In production, write to a durable queue + notify reviewers.
PENDING: dict[str, dict] = {}


def ask_for_approval(amount_cents: int, reason: str,
                     tool_context: ToolContext) -> dict:
    """Pause and ask a human to approve a refund.

    Args:
      amount_cents: refund amount, integer cents.
      reason: one-line justification for the refund.

    Returns a handle the reviewer will resolve.
    """
    handle = str(uuid.uuid4())
    PENDING[handle] = {"amount_cents": amount_cents, "reason": reason,
                       "session_id": tool_context._invocation_context.session.id}
    return {"pending": True, "handle": handle}


def issue_refund(order_id: str, amount_cents: int) -> dict:
    """Issue a refund. Only call after approval returns approved=True."""
    return {"ok": True, "order_id": order_id, "amount_cents": amount_cents}


root_agent = LlmAgent(
    name="refunds",
    model="gemini-2.5-flash",
    description="Handles refund requests with human approval.",
    instruction=(
        "When a user asks for a refund, first call ask_for_approval "
        "with the amount and a one-line reason. Only call issue_refund "
        "after the approval returns {approved: True}."),
    tools=[issue_refund, LongRunningFunctionTool(func=ask_for_approval)],
)
