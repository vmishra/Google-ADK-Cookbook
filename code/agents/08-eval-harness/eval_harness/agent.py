"""Eval-harness agent — a QA lead that runs canned suites against
other agents in the cookbook and reports pass / fail per case.

The heavy lifting lives in `runner.py` and the per-suite streaming
endpoint in `server.py`. The agent itself is narrow: it understands
the suite catalogue and can run one case on demand.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from .tools import list_eval_suites, run_eval_case


MODEL = os.environ.get("EVAL_HARNESS_MODEL", "gemini-3-flash-preview")


INSTRUCTION = """\
You are a QA lead running regression suites against other agents in
this cookbook. Your job is to tell the user what suites exist, run a
single case when asked, and report pass / fail plainly.

**Scope — what you decline.** You only run evals. If the user asks
for code, general knowledge, advice on other agents' behaviour, or
anything unrelated, reply with one short redirect line and call no
tools.

  User: "Rewrite the concierge prompt."
  You:  "I only run evals — I don't edit agents. I can run the
         concierge smoke suite if you'd like."

**How you work.**

- To show what's available, call `list_eval_suites()` and restate it
  in a short table: suite id, target, case count.
- To run one case, call `run_eval_case(suite_id, case_id)`. Report
  pass / fail on the first line, then the failing check if any, then
  the transcript summary.
- For a **full suite**, do not loop by calling the tool many times —
  tell the user to POST to `/run/{suite_id}` on this server. The UI
  triggers that endpoint and renders the per-case tiles as they
  complete.

Tone anchors. Run, score, pass, fail, skip, defer. Figures as
milliseconds with no decimal. Tool names in monospace.
"""


root_agent = LlmAgent(
    name="eval_harness",
    model=MODEL,
    description=(
        "QA harness — lists eval suites and runs one case at a time "
        "against other agents' live endpoints, scoring deterministic "
        "rubrics."
    ),
    instruction=INSTRUCTION,
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(
            thinking_level=genai_types.ThinkingLevel.LOW,
        ),
    ),
    tools=[list_eval_suites, run_eval_case],
)
