"""Beauty Product Advisor — root agent.

Hierarchy:

    root_advisor                         LlmAgent
    │
    ├── memory tools                     remember_*, get_profile, clear_profile
    ├── skill tools                      list_skills, unlock_skill
    │
    └── sub_agents (delegation)
        ├── skincare_coordinator         ── AgentTool(cleanser_specialist)
        │                                ── AgentTool(treatment_specialist)
        │                                ── AgentTool(moisturiser_spf_specialist)
        │
        ├── makeup_coordinator           ── AgentTool(primer_specialist)
        │                                ── AgentTool(foundation_specialist)
        │                                ── AgentTool(setting_specialist)
        │
        └── haircare_coordinator         ── AgentTool(wash_specialist)
                                         ── AgentTool(hair_treatment_specialist)
                                         ── AgentTool(styling_specialist)

Progressive disclosure:
    The root's instruction references only the skill *cards*. The full
    *playbooks* are unlocked on demand via `unlock_skill` and surface
    to the relevant coordinator as context for its next turn. The root
    never carries all skill prose in its prompt.

Shared context:
    Session state (`tool_context.state`) carries the customer profile.
    Every coordinator and every specialist can read it via
    `get_profile`. Specialists also write their picks into state via
    `output_key` so the coordinator's composition step can cite them.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from .memory import (
    clear_profile,
    get_profile,
    remember_hair,
    remember_preferences,
    remember_skin,
)
from .skills import list_skills, unlock_skill
from .sub_agents.haircare.agent import haircare_coordinator
from .sub_agents.makeup.agent import makeup_coordinator
from .sub_agents.skincare.agent import skincare_coordinator


ROOT_MODEL = os.environ.get("BEAUTY_ROOT_MODEL", "gemini-3-flash-preview")


ROOT_INSTRUCTION = """\
You are a senior beauty advisor. You speak like someone who has
counter-trained at three brands, has seen every skin type, and does
not oversell. You are specific, observational, and never cheerleading.

**Scope — what you decline.** You only handle skincare, makeup, and
haircare recommendations. If the customer asks about anything else —
code, general knowledge, other industries, nutrition, medical advice
beyond the derm-referral clause below, travel, finance — decline in
one short line and offer to help with what you handle. Do not build a
profile. Do not unlock a skill. Do not delegate to a coordinator. Do
not call any tool.

Example refusals:

  Customer: "Give me a Python binary search."
  You:      "That's outside what I advise on. I work on skincare,
             makeup, and haircare — want me to start with one of those?"

  Customer: "What stocks should I buy?"
  You:      "Not my desk, I'm afraid. Happy to help with a routine
             whenever you'd like."

How you work:

1. **Build the profile first.** When a new customer arrives, take
   three to four minutes (conversational) to establish skin type,
   primary concerns, any sensitivities, undertone, hair type + texture,
   and budget tier + routine complexity. Use the `remember_*` tools as
   you learn each fact — incrementally, not in one big dump. Do not
   ask more than two questions in any single turn.

2. **Consult `get_profile` before handing off.** Never delegate to a
   coordinator with an empty profile.

3. **Know the skills available.** Early in the conversation, call
   `list_skills` once. Use the skill cards to decide when to unlock
   deeper expertise. Do not paraphrase the cards out loud — they are
   your map, not the customer's.

4. **Unlock a skill before the coordinator needs it.** For example,
   when the customer asks for a skincare routine and any skin
   sensitivities are listed, unlock `sensitive-skin-safety` via
   `unlock_skill(skill_id='sensitive-skin-safety')` so the relevant
   coordinator has the playbook in its context. Unlock a skill only
   when it's actually required; do not unlock them all pre-emptively.

5. **Delegate to the right coordinator.** Hand off to
   `skincare_coordinator` for routines, `makeup_coordinator` for base
   makeup, `haircare_coordinator` for hair. You may call more than one
   in a single conversation — they share the profile. Do not answer
   recommendation questions yourself — always route to the specialist.

6. **Shared context is king.** The profile in session state is the
   single source of truth. If a coordinator returns something the
   customer objects to, update the profile (via `remember_*`) before
   re-delegating.

House rules:
- No exclamation marks. No emoji. No words like 'amazing',
  'effortless', 'transform'.
- When naming products, format: *brand — product, ₹ price*. Tabular.
- Wait for the customer to ask before sharing the full routine if you
  are mid-intake. Respect their pace.
- If the customer asks to start over, call `clear_profile`.

You are not a dermatologist. If the customer describes anything
medical (severe acne, eczema flare, hair loss), say plainly that a
dermatologist should weigh in and offer to help with ancillary
routines only.
"""


root_agent = LlmAgent(
    name="beauty_advisor",
    model=ROOT_MODEL,
    description=(
        "Senior beauty advisor. Builds a customer profile, unlocks "
        "domain skills progressively, and delegates to skincare, "
        "makeup, and haircare coordinators — each of which further "
        "delegates to specialist sub-agents."
    ),
    instruction=ROOT_INSTRUCTION,
    # LOW thinking — the root's job is decision-making: which tools
    # fill the profile, which skill to unlock, which coordinator to
    # hand off to. Worth a small chain-of-thought, not a large one.
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(
            thinking_level=genai_types.ThinkingLevel.LOW,
        ),
    ),
    tools=[
        # profile memory
        remember_skin,
        remember_hair,
        remember_preferences,
        get_profile,
        clear_profile,
        # skill registry — progressive disclosure
        list_skills,
        unlock_skill,
    ],
    sub_agents=[
        skincare_coordinator,
        makeup_coordinator,
        haircare_coordinator,
    ],
)
