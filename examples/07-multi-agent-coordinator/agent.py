"""Coordinator + three specialists."""
import asyncio

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.genai import types


def lookup_invoice(invoice_id: str) -> dict:
    return {"ok": True, "id": invoice_id, "status": "paid", "amount_cents": 4200}


def check_logs(service: str) -> dict:
    return {"ok": True, "service": service,
            "errors_last_hour": 3, "top_error": "connection timeout"}


def start_return(order_id: str) -> dict:
    return {"ok": True, "rma": f"RMA-{order_id}", "label_url": "https://x/label"}


billing = LlmAgent(
    name="billing", model="gemini-3-flash-preview",
    description="Answers billing questions: invoices, charges, refunds.",
    instruction="Use lookup_invoice. Be brief.",
    tools=[lookup_invoice])

tech = LlmAgent(
    name="tech_support", model="gemini-3-flash-preview",
    description="Diagnoses technical problems with the product.",
    instruction="Use check_logs when an outage is reported. Be brief.",
    tools=[check_logs])

returns = LlmAgent(
    name="returns", model="gemini-3-flash-preview",
    description="Handles return requests and RMAs.",
    instruction="Use start_return. Be brief.",
    tools=[start_return])


root_agent = LlmAgent(
    name="coordinator",
    model="gemini-3-flash-preview",
    description="Routes user to the right specialist.",
    instruction=(
        "Classify the user's request and transfer to billing, tech_support, "
        "or returns. Do not answer specialised questions yourself."),
    sub_agents=[billing, tech, returns],
)


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="support")
    s = await runner.session_service.create_session(app_name="support", user_id="u")
    for q in ["What's the status of invoice 7821?",
              "My service is returning 500s.",
              "I need to return order 9001."]:
        print(f"\n> {q}")
        async for e in runner.run_async(
            user_id="u", session_id=s.id,
            new_message=types.Content(role="user", parts=[types.Part(text=q)])):
            if e.content and e.content.parts:
                for p in e.content.parts:
                    if p.text: print(p.text, end="", flush=True)
        print()


if __name__ == "__main__":
    asyncio.run(_main())
