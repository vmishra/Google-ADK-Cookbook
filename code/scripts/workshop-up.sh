#!/usr/bin/env bash
# Start every agent server + the portal in one shot.
# Ctrl-C tears them all down — including grandchild python processes.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .logs

# Refuse to start if any target port is already bound — that almost
# always means a stale uvicorn from a previous run is still up.
PORTS=(5174 8001 8002 8003 8004 8005)
busy=()
for p in "${PORTS[@]}"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    busy+=("$p")
  fi
done
if (( ${#busy[@]} )); then
  echo "ports already in use: ${busy[*]}"
  echo "kill them first, e.g.:"
  echo "  lsof -ti:${busy[*]// /,} | xargs -r kill -9"
  exit 1
fi

pids=()
cleanup() {
  echo
  echo "stopping..."
  # Kill each pid's entire process group (the python children included).
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  sleep 0.5
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

start_agent() {
  local dir=$1 port=$2 name=$3
  echo "starting $name on :$port"
  # setsid gives each agent its own process group so cleanup() can
  # signal the whole tree, not just the shell wrapper.
  setsid bash -c "
    cd 'agents/$dir'
    if [[ ! -d .venv ]]; then
      python3 -m venv .venv
      .venv/bin/pip install -q -r requirements.txt
    fi
    exec .venv/bin/uvicorn server:app --host 127.0.0.1 --port '$port'
  " > ".logs/$name.log" 2>&1 &
  pids+=("$!")
}

start_agent 01-concierge             8001 concierge
start_agent 02-travel-planner        8002 travel-planner
start_agent 03-payments-support      8003 payments-support
start_agent 04-food-delivery-support 8004 food-delivery-support
start_agent 05-beauty-advisor        8005 beauty-advisor

setsid bash -c "
  cd portal
  if [[ ! -d node_modules ]]; then npm install; fi
  exec npm run dev -- --port 5174 --host 127.0.0.1
" > .logs/portal.log 2>&1 &
pids+=("$!")

echo
echo "portal          http://127.0.0.1:5174"
echo "concierge       http://127.0.0.1:8001"
echo "travel planner  http://127.0.0.1:8002"
echo "payments voice  http://127.0.0.1:8003"
echo "food delivery   http://127.0.0.1:8004"
echo "beauty advisor  http://127.0.0.1:8005"
echo
echo "logs in .logs/"
echo "Ctrl-C to stop (everything, including subprocesses)."
wait
