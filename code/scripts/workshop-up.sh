#!/usr/bin/env bash
# Start every agent server + the portal in one shot.
# Ctrl-C tears them all down.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .logs

pids=()
cleanup() {
  echo
  echo "stopping..."
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait || true
}
trap cleanup INT TERM EXIT

start_agent() {
  local dir=$1 port=$2 name=$3
  echo "starting $name on :$port"
  (
    cd "agents/$dir"
    if [[ ! -d .venv ]]; then
      python3 -m venv .venv
      .venv/bin/pip install -q -r requirements.txt
    fi
    .venv/bin/uvicorn server:app --host 127.0.0.1 --port "$port" \
      > "../../.logs/$name.log" 2>&1
  ) &
  pids+=("$!")
}

start_agent 01-concierge            8001 concierge
start_agent 02-travel-planner       8002 travel-planner
start_agent 03-payments-support     8003 payments-support
start_agent 04-food-delivery-support 8004 food-delivery-support

(
  cd portal
  if [[ ! -d node_modules ]]; then npm install; fi
  npm run dev -- --port 5174 --host 127.0.0.1 \
    > ../.logs/portal.log 2>&1
) &
pids+=("$!")

echo
echo "portal          http://127.0.0.1:5174"
echo "concierge       http://127.0.0.1:8001"
echo "travel planner  http://127.0.0.1:8002"
echo "payments voice  http://127.0.0.1:8003"
echo "food delivery   http://127.0.0.1:8004"
echo
echo "logs in .logs/"
echo "Ctrl-C to stop."
wait
