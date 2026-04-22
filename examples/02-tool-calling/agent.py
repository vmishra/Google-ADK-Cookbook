"""An invoice assistant with three tools, demonstrating ToolContext."""
import asyncio

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.adk.tools.tool_context import ToolContext
from google.genai import types


INVOICES = {
    "7821": {"status": "paid",   "amount_cents": 4214, "due": "2026-04-01"},
    "7822": {"status": "unpaid", "amount_cents": 9900, "due": "2026-04-15"},
    "7823": {"status": "unpaid", "amount_cents": 1700, "due": "2026-04-20"},
}


def lookup_invoice(invoice_id: str) -> dict:
    """Return an invoice record by id, or {'ok': False} if missing."""
    rec = INVOICES.get(invoice_id)
    if rec is None:
        return {"ok": False, "reason": "not_found"}
    return {"ok": True, **rec}


def mark_paid(invoice_id: str, tool_context: ToolContext) -> dict:
    """Mark an invoice paid. Requires user:is_admin in session state."""
    if not tool_context.state.get("user:is_admin"):
        return {"ok": False, "reason": "admin_only"}
    rec = INVOICES.get(invoice_id)
    if rec is None:
        return {"ok": False, "reason": "not_found"}
    rec["status"] = "paid"
    tool_context.state["last_marked_paid"] = invoice_id
    return {"ok": True, "id": invoice_id, "status": rec["status"]}


def list_recent(tool_context: ToolContext) -> dict:
    """Return the three most recent invoices."""
    tool_context.state["last_listed_at"] = "now"
    return {"invoices": list(INVOICES.keys())[-3:]}


root_agent = LlmAgent(
    name="invoice_agent",
    model="gemini-3-flash-preview",
    description="Answers invoice questions.",
    instruction=(
        "You help with invoice questions. Use lookup_invoice for status, "
        "mark_paid to mark one paid (only if state['user:is_admin']), and "
        "list_recent for recent invoices. Be brief."),
    tools=[lookup_invoice, mark_paid, list_recent],
)


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="invoice")
    session = await runner.session_service.create_session(
        app_name="invoice", user_id="demo",
        state={"user:is_admin": True})
    prompts = [
        "What's the status of invoice 7821?",
        "Mark 7822 as paid.",
        "List the recent invoices.",
    ]
    for p in prompts:
        print(f"\n> {p}")
        async for e in runner.run_async(
            user_id="demo", session_id=session.id,
            new_message=types.Content(role="user", parts=[types.Part(text=p)])):
            if e.content and e.content.parts:
                for part in e.content.parts:
                    if part.text: print(part.text, end="", flush=True)
        print()


if __name__ == "__main__":
    asyncio.run(_main())
