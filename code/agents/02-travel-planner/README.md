# 02 · Travel planner

A deep-research travel planner built as a **three-phase pipeline**:

```
  user brief
      │
      ▼
  planner            LlmAgent — structures the brief into a typed plan.
      │              output_key: "plan"
      ▼
  parallel
  ┌─ flight_researcher ──┐
  │  hotel_researcher    │   ParallelAgent — each sub-agent runs
  │  activity_researcher │   concurrently against a mocked tool.
  └──────────────────────┘   output_keys: flights_brief, hotels_brief,
      │                                   activities_brief
      ▼
  composer           LlmAgent — reads state and produces an editorial
                     itinerary top to bottom. output_key: "itinerary"
```

## What to notice

- **Composition.** The root is a `SequentialAgent`; inside it is a
  `ParallelAgent` that fans out the three researchers. This matches
  the deep-research pattern in `google/adk-samples/deep-search`.
- **State as the contract.** No direct calls between sub-agents —
  each reads and writes `tool_context.state` via `output_key`. This
  is what makes the parallelism safe.
- **Two model tiers.** The planner and composer use
  `gemini-3.1-flash`; the three researchers use
  `gemini-3.1-flash-lite` for tool-heavy, latency-sensitive work.
- **Reproducible mocks.** Every search tool seeds randomness on its
  inputs, so a given brief always produces the same fixtures — useful
  for live demos.

## Run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # fill in GOOGLE_API_KEY
uvicorn server:app --reload --port 8002
```

## Prompts worth trying

- *"Two of us, Delhi to Lisbon, 8–14 November, premium cabin. We like architecture, tile work, quiet mornings, and one good sushi night."*
- *"A week in Lisbon from March 14th, with a 13-year-old, mid-range hotels, and food as the organising theme."*
- *"DEL–LIS, 10 to 16 Feb, return, business, luxury hotels, interest in art."*

The agent infers sensible defaults for anything you omit and notes
them at the end of the itinerary.
