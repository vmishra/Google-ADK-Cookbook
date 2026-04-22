# CLI cheatsheet

```bash
adk --version                       # show version

# Run
adk run agents/support              # interactive REPL
adk run agents/support --replay path/to/session.json
adk run agents/support --resume path/to/session.json
adk run agents/support --model gemini-3.1-pro-preview

# Dev UI
adk web                             # http://127.0.0.1:8000
adk web --port 9000
adk web --host 0.0.0.0

# Eval
adk eval agents/support agents/support/eval/regression.evalset.json
adk eval agents/support agents/support/eval/*.test.json \
  --config_file_path eval/config.json \
  --print_detailed_results

# API server
adk api_server --port 8080
adk api_server --a2a --agents agents.support --port 8443
adk api_server --session_service_url postgres://...

# Deploy
adk deploy agent_engine agents/support \
  --project $GOOGLE_CLOUD_PROJECT \
  --region us-central1 \
  --display_name support-bot

adk deploy cloud_run agents/support \
  --project $GOOGLE_CLOUD_PROJECT \
  --region us-central1 \
  --service_name support-bot

# Build
adk build agents/support --out agent_config.yaml
```
