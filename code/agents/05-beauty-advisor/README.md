# 05 · Beauty Product Advisor

A three-tier agent hierarchy with skills, memory, and shared context —
the most feature-dense example in the bundle.

## Shape

```
root_advisor                                       gemini-3-flash-preview
├── profile memory tools                           remember_skin, remember_hair,
│                                                  remember_preferences,
│                                                  get_profile, clear_profile
├── skill registry                                 list_skills, unlock_skill
│                                                  (5 skills, progressive disclosure)
│
└── sub_agents (delegation)
    ├── skincare_coordinator                       gemini-3-flash-preview
    │   ├── AgentTool(cleanser_specialist)         gemini-3.1-flash-lite-preview
    │   ├── AgentTool(treatment_specialist)        gemini-3.1-flash-lite-preview
    │   └── AgentTool(moisturiser_spf_specialist)  gemini-3.1-flash-lite-preview
    │
    ├── makeup_coordinator                         gemini-3-flash-preview
    │   ├── AgentTool(primer_specialist)           gemini-3.1-flash-lite-preview
    │   ├── AgentTool(foundation_specialist)       gemini-3.1-flash-lite-preview
    │   └── AgentTool(setting_specialist)          gemini-3.1-flash-lite-preview
    │
    └── haircare_coordinator                       gemini-3-flash-preview
        ├── AgentTool(wash_specialist)             gemini-3.1-flash-lite-preview
        ├── AgentTool(hair_treatment_specialist)   gemini-3.1-flash-lite-preview
        └── AgentTool(styling_specialist)          gemini-3.1-flash-lite-preview
```

Three tiers of model selection: the root speaks with the customer and
plans; coordinators compose; specialists do the narrow catalogue work.

## What to notice

- **Hierarchy with two kinds of delegation.** `sub_agents=[...]` on
  the root turns the coordinators into proper ADK sub-agents — the
  root can *transfer* control to them. Inside each coordinator,
  `AgentTool(specialist)` makes the specialist callable like a tool —
  the coordinator gathers their results and composes.
- **Progressive disclosure of skills.** Five skills live in
  `beauty_advisor/skills/__init__.py`. The root sees only the short
  *cards* via `list_skills`; the long *playbooks* are fetched via
  `unlock_skill(skill_id=…)` when the situation warrants. The root's
  context stays small.
- **Memory as shared context.** The customer profile (skin, hair,
  preferences) lives in session state. Every coordinator and
  specialist reads it via `get_profile`. Specialists write their
  picks back via `output_key` so the coordinator can compose from
  state rather than re-asking.
- **Incremental profile building.** `remember_skin`,
  `remember_hair`, `remember_preferences` each accept *partial*
  updates — the root fills the profile turn-by-turn as the customer
  mentions things, never blocking to collect everything up front.
- **Handoff-ready.** The root never answers recommendation questions
  itself — it delegates. That's the pattern you want for a
  platform-style advisor: the root's prompt stays stable while the
  domain logic evolves inside coordinators.

## Run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                  # fill in GOOGLE_API_KEY
uvicorn server:app --reload --port 8005
```

Endpoints:

- `GET  /health`               — hierarchy summary.
- `GET  /metrics`              — last-50 turns + aggregate.
- `GET  /profile/{session_id}` — live customer profile — useful to
                                  show shared context in the portal.
- `POST /session`              — new session.
- `POST /chat/{session_id}`    — SSE stream.

## Prompts worth trying

- *"Hi, I'm looking for help with my skincare. I have combination skin and I break out on my chin. Mid-range budget, I prefer fragrance-free."*
- *"Can you also sort out a foundation for me? I'm neutral, medium coverage, satin finish."*
- *"Let's add haircare — I have fine, wavy hair, recently coloured. I live in Mumbai so humidity is a thing."*
- *"I'd rather not use retinol — it's too much for my skin."* (Agent should update profile and adjust its treatment pick.)
- *"Start over."*

Watch the agent build the profile incrementally, unlock the
sensitive-skin-safety skill once you mention a sensitivity, and
delegate to the right coordinator without mixing concerns.
