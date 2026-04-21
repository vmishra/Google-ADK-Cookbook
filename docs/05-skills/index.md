# Chapter 5 — Skills

<span class="kicker">chapter 05 · the agent skill spec</span>

Skills are packaged units of agent behaviour. A skill is a directory
with a `SKILL.md` at the top level, optional `references/`, `assets/`,
and `scripts/` subdirectories, and the Agent Skill specification
describes the format.

The point of skills is *progressive disclosure*: the model sees a
one-line description until a skill becomes relevant, then reads the
body, then — only if needed — reads individual references. The token
cost stays proportional to what is actually used.

---

## Why skills exist

A monolithic instruction that covers every task the agent might do
will be long, unfocused, and expensive. A per-skill structure:

- lets the model pull in only what it needs,
- lets non-engineers edit behaviour by editing Markdown,
- turns reusable behaviours into version-controllable artefacts,
- crosses language/tool boundaries (the spec is language-agnostic).

```mermaid
flowchart TB
  subgraph LoadTime[At load time]
    SK[skills/weather/SKILL.md] -->|frontmatter only| L1[L1 metadata]
  end
  subgraph InvocationTime[When relevant]
    Body[SKILL.md body] --> L2[L2 instructions]
  end
  subgraph OnDemand[Only if needed]
    Refs[references/*.md] --> L3[L3 deep references]
    Scripts[scripts/*.py] --> L3
  end
  style L1 fill:#c9a45a,color:#0f0f12
  style L2 fill:#c9a45a,color:#0f0f12
  style L3 fill:#c9a45a,color:#0f0f12
```

---

## Pages

| Page | Covers |
|---|---|
| [Authoring a skill](authoring.md) | `SKILL.md` format, file layout, first skill |
| [Progressive disclosure](progressive-disclosure.md) | L1 → L2 → L3 pattern and token budgeting |
| [Skill patterns](skill-patterns.md) | Common templates and anti-patterns |
