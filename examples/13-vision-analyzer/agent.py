"""Receipt analyzer that extracts structured fields from an image."""
import asyncio
from pathlib import Path

from pydantic import BaseModel
from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.genai import types


class ReceiptFields(BaseModel):
    merchant: str
    total_cents: int
    tip_cents: int
    date_iso: str


root_agent = LlmAgent(
    name="receipt_analyzer",
    model="gemini-3.1-pro-preview",
    description="Extracts fields from a receipt image.",
    instruction=(
        "Given an image of a receipt, extract merchant name, total, tip, "
        "and date. Return JSON matching ReceiptFields. If any field is "
        "missing, set it to a reasonable default (e.g. 0 cents, empty "
        "string) and note uncertainty."),
    output_schema=ReceiptFields,
    output_key="fields",
)


async def _main(image_path: str):
    runner = InMemoryRunner(agent=root_agent, app_name="vision")
    s = await runner.session_service.create_session(app_name="vision", user_id="u")
    image_bytes = Path(image_path).read_bytes()
    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
    msg = types.Content(role="user", parts=[
        types.Part(text="Extract the fields from this receipt."),
        image_part])
    async for e in runner.run_async(user_id="u", session_id=s.id, new_message=msg):
        if e.content and e.content.parts:
            for p in e.content.parts:
                if p.text: print(p.text, end="", flush=True)
    print()


if __name__ == "__main__":
    import sys
    asyncio.run(_main(sys.argv[1] if len(sys.argv) > 1 else "receipt.jpg"))
