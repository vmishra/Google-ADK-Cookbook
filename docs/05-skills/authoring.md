# Authoring a skill

<span class="kicker">ch 05 · page 1 of 3</span>

Build a weather skill from scratch. Fifteen minutes.

---

## Layout

```
skills/
└── weather/
    ├── SKILL.md
    ├── references/
    │   ├── FORMATS.md
    │   └── UNITS.md
    ├── assets/
    │   └── city-aliases.json
    └── scripts/
        └── fahrenheit_to_celsius.py
```

Only `SKILL.md` is required. The rest is loaded on demand.

## `SKILL.md`

```markdown
---
name: weather
description: >
  Answers weather questions. Supports current conditions, next 3-day
  forecast, and unit conversions. Uses the get_weather tool.
---

# Weather skill

## When to use this skill

A user question is weather-related if it references temperature, sky,
precipitation, wind, or a forecast window ("today", "this weekend").

## How to answer

1. Identify the city. If the user says "here" or "there", read
   `state['last_city']`. If missing, ask.
2. Call the `get_weather` tool with that city.
3. Respond concisely. One sentence for current, three bullets for
   forecast.
4. For unit conversion, see `references/UNITS.md`.

## Output format

See `references/FORMATS.md` for the exact reply templates.
```

The frontmatter is what the model sees at load time. The body is
what it reads when it decides the skill is relevant. References are
pulled in on demand.

## Loading the skill

```python
from google.adk.agents import LlmAgent
from google.adk.skills import load_skill_from_dir
from google.adk.tools.skill_toolset import SkillToolset

weather = load_skill_from_dir("./skills/weather")

root_agent = LlmAgent(
    name="assistant",
    model="gemini-3.1-pro",
    tools=[SkillToolset(skills=[weather])],
)
```

The `SkillToolset` handles lazy loading. The model sees a tool for
each skill that loads its body; references are loaded only when the
skill body references them and the model decides to fetch them.

## Inline skills

When the skill is small enough to inline, use the `Skill` model
directly:

```python
from google.adk.skills import models

greeting = models.Skill(
    frontmatter=models.Frontmatter(
        name="greeting",
        description="Friendly greetings, time-of-day aware.",
    ),
    instructions=(
        "Greet the user by name if known (state['user:name']). "
        "Use morning/afternoon/evening based on their timezone."),
    resources=models.Resources(
        references={"examples.md": "- Good morning, Vikas.\n- Evening, all."},
    ),
)
```

Inline is convenient for small skills and tests. File-based is
better for real work because the skill is editable without code
changes.

## Storing skills on GCS

For multi-tenant platforms, skills can live in a bucket and be
loaded at startup:

```python
from google.adk.skills import load_skill_from_gcs

weather = load_skill_from_gcs("gs://my-bucket/skills/weather/")
```

See `contributing/samples/skills_agent_gcs` for the full example.

---

## Authoring rules

- **The description is the only thing the model always sees.** Keep
  it to two lines. Include *when* to use the skill and *what* it
  does.
- **The body is the main instruction.** Write it as if the model
  just opened the file — do not assume prior context.
- **Put examples in references.** The model loads them only if the
  body gestures at them.
- **Make references standalone.** A reference must be useful if
  opened first.

## Skills + tools

A skill often uses tools. Combine them in the toolset:

```python
toolset = SkillToolset(
    skills=[weather],
    tools=[get_weather, get_forecast],       # normal function tools
    code_executor=UnsafeLocalCodeExecutor(),  # optional — for scripts/
)
```

The `code_executor` lets skills run their own scripts (e.g.
`scripts/fahrenheit_to_celsius.py`) when the skill body tells the
model to.

---

## See also

- [`examples/08-skills-weather`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/08-skills-weather)
- `contributing/samples/skills_agent`, `skills_agent_gcs`,
  `local_environment_skill` in `google/adk-python`.
- [Agent Skill spec](https://agentskills.io/specification).
