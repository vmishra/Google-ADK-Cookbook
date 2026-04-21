"""Small support agent used as the subject of the eval suite."""
from google.adk.agents import LlmAgent
from google.adk.tools.tool_context import ToolContext


ORDERS = {"7821": {"status": "shipped", "total": 4214}}


def lookup_order(order_id: str) -> dict:
    return ORDERS.get(order_id) or {"ok": False, "reason": "not_found"}


def mark_paid(invoice_id: str, tool_context: ToolContext) -> dict:
    if not tool_context.state.get("user:is_admin"):
        return {"ok": False, "reason": "admin_only"}
    return {"ok": True, "invoice_id": invoice_id}


root_agent = LlmAgent(
    name="support",
    model="gemini-2.5-flash",
    description="Support agent for demo eval.",
    instruction="Use lookup_order for status; mark_paid needs admin.",
    tools=[lookup_order, mark_paid],
)
