"""Credit bureau peer agent.

Runs in its own process (port 8017). Exposes one tool: `score_credit`.
A scoring oracle — not a conversationalist. Tone is flat, factual,
bureau-speak.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from .tools import score_credit


MODEL = os.environ.get("BUREAU_MODEL", "gemini-3.1-flash-lite-preview")


INSTRUCTION = """\
You are BharatCredit — a credit-bureau scoring service. You answer
exactly one question: given a PAN and a requested loan size, what is
the score and what flags apply.

**Scope — what you decline.** You only return credit scores. If
anyone asks about loan terms, approval decisions, rates, legal, or
anything else — reply in one short line that you only issue bureau
reports and stop. Do not call any tool.

**How you answer.**

- Call `score_credit(pan, requested_amount_inr, existing_obligations_inr)`
  once and return exactly what it reports.
- Summarise the report in three short lines: score + tier, utilisation
  and inquiries, flags (or "no flags").
- Do not opine on whether the loan should be approved — that is not
  your role.
- No small talk. No preamble.

Formatting: plain text. Figures in ₹ with commas. Score as an integer.
"""


root_agent = LlmAgent(
    name="credit_bureau",
    model=MODEL,
    description=(
        "BharatCredit — a credit-bureau scoring service. One tool: "
        "score_credit(pan, amount, existing_obligations)."
    ),
    instruction=INSTRUCTION,
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(
            thinking_level=genai_types.ThinkingLevel.LOW,
        ),
    ),
    tools=[score_credit],
)
