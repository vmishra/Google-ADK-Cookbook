# Examples

Twenty self-contained example agents. Each directory is a complete
mini-project with its own `README.md`, `requirements.txt`, and
runnable entry point.

Run any example from its directory:

```bash
cd examples/01-hello-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m agent
```

---

## Pedagogical order

| # | Example | Chapter |
|---|---|---|
| 01 | [hello-agent](01-hello-agent/) | 1, 3 |
| 02 | [tool-calling](02-tool-calling/) | 4 |
| 03 | [sequential-workflow](03-sequential-workflow/) | 3 |
| 04 | [parallel-research](04-parallel-research/) | 3 |
| 05 | [loop-agent-refiner](05-loop-agent-refiner/) | 3 |
| 06 | [memory-backed-assistant](06-memory-backed-assistant/) | 10 |
| 07 | [multi-agent-coordinator](07-multi-agent-coordinator/) | 9 |
| 08 | [skills-weather](08-skills-weather/) | 5 |
| 09 | [computer-use-browser](09-computer-use-browser/) | 7 |
| 10 | [mcp-integration](10-mcp-integration/) | 4, 16 |
| 11 | [deep-research](11-deep-research/) | 8 |
| 12 | [voice-assistant-live](12-voice-assistant-live/) | 6 |
| 13 | [vision-analyzer](13-vision-analyzer/) | 6 |
| 14 | [a2a-federation](14-a2a-federation/) | 9, 16 |
| 15 | [langchain-bridge](15-langchain-bridge/) | 16 |
| 16 | [crewai-bridge](16-crewai-bridge/) | 16 |
| 17 | [long-running-job](17-long-running-job/) | 4, 14 |
| 18 | [eval-suite](18-eval-suite/) | 12 |
| 19 | [cost-optimizer](19-cost-optimizer/) | 15 |
| 20 | [production-template](20-production-template/) | 13, 19 |

---

## Environment

All examples assume:

```bash
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1
```

or the Gemini API path:

```bash
export GOOGLE_GENAI_USE_VERTEXAI=false
export GOOGLE_API_KEY=your-key
```

Examples that need additional credentials document them in their
own `README.md`.
