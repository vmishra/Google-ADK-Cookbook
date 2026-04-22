# Models cheatsheet

| Model | Strength | Typical cost profile | Use for |
|---|---|---|---|
| `gemini-3-flash-preview` | Fast, cheap, solid tool calling | lowest | Default |
| `gemini-3.1-pro-preview` | Reasoning, instruction following | medium-high | Planning, synthesis |
| `gemini-3.1-flash-lite-preview` | Minimal, classification | very low | Classifiers, routers |
| `gemini-live-2.5-flash-native-audio` | Bidi audio (Vertex) | medium | Voice agents |
| `gemini-2.5-flash-native-audio-preview-12-2025` | Bidi audio (Gemini API) | medium | Voice agents on the API path |
| `gemini-2.5-computer-use-preview-10-2025` | Browser operation | medium-high | Computer use |

Rules of thumb:

- Start every agent on Flash. Upgrade components one at a time.
- Planners and synthesisers benefit from Pro. Bulk retrieval and
  classification do not.
- Voice and computer use are model-specific — the agent definition
  does not change, only the model ID.
- `LiteLlm(model="openai/gpt-4o")` for cross-vendor. Not all
  features (Live, computer use) work on non-Gemini models.
