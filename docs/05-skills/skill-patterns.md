# Skill patterns

<span class="kicker">ch 05 · page 3 of 3</span>

Templates that work. Keep skills small, focused, and self-contained —
this is where the benefits compound.

---

## Pattern: procedure skill

A step-by-step procedure the model follows when a trigger fires.

```markdown
---
name: refund_request
description: >
  Handles customer refund requests. Use when the user asks for a
  refund, return, or chargeback. Consults policy before acting.
---

# Refund request

## Preconditions

Read `state['user:tier']`. If blank, call `identify_user` first.

## Procedure

1. Ask for the order id (unless already in state).
2. Call `lookup_order(order_id)`.
3. Check policy in `references/POLICY.md` for the order's age and
   status.
4. If policy allows a refund, call `issue_refund(order_id)` and
   confirm. Otherwise explain why and offer a store credit via
   `offer_store_credit`.

## Templates

See `references/REPLIES.md` for the phrasing of each outcome.
```

## Pattern: format skill

A skill whose entire job is to shape output.

```markdown
---
name: dossier_format
description: >
  Formats a research summary as a one-page dossier. Use for any
  request that asks for a "dossier", "brief", or "summary card".
---

# Dossier format

Produce four sections, in this order, each bordered with a horizontal
rule in Markdown:

1. Headline (10-12 words).
2. Three bullets of key facts, each 20-30 words.
3. A pull-quote, italicised.
4. "Sources" with numbered citations.

Do not use emoji, exclamation marks, or hedging language. Use tabular
numerals for any figures. For the print layout, see
`references/PRINT.md`.
```

## Pattern: policy skill

A skill whose body is short but whose references are dense. The body
gestures; the references carry the weight.

```markdown
---
name: acceptable_use
description: >
  Rules for what this agent will and will not help with. Consult
  before any action that could affect another user's data.
---

# Acceptable use

Never perform the actions in `references/HARD_LIMITS.md`. For any
action, cross-reference `references/POLICY.md` — the mapping of
actions to required permissions is authoritative there.
```

## Pattern: subject-matter skill

A skill that encodes domain knowledge. The body is an overview; the
references are deep dives per topic.

```
skills/
└── finance_advisory/
    ├── SKILL.md
    └── references/
        ├── RISK_TOLERANCE.md
        ├── PORTFOLIO_REBALANCING.md
        ├── TAX_LOT_HARVESTING.md
        └── RETIREMENT_ACCOUNTS.md
```

---

## Anti-patterns

- **Kitchen-sink skills.** One skill titled "customer_support" that
  tries to handle every case. Split by trigger.
- **Skills that need other skills.** If skill A always requires
  skill B, fold B into A or inline the dependency.
- **Descriptions written for humans.** The description is a
  retrieval query. *"Handles refund requests (see POLICY for
  timelines)."* beats *"A helpful guide for when customers have
  concerns about their purchases."*
- **Putting secrets in a skill.** Skills are not a safe place for
  credentials. Use `CredentialService`.

---

## What's next

- [Chapter 6 — Multimodal & Live](../06-multimodal/index.md) — skills
  that operate over voice and vision.
- [`examples/08-skills-weather`](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/08-skills-weather)
  — a worked example.
