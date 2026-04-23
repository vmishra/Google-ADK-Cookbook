#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/presentation"
PID_FILE="$APP_DIR/.dev-server.pid"
LOG_FILE="$APP_DIR/.dev-server.log"

usage() {
  cat <<EOF
Usage: $(basename "$0") {start|stop|restart|status|logs}

  start    Install deps if missing, then start the Vite dev server in the background.
  stop     Stop the running dev server.
  restart  Stop (if running) then start.
  status   Show whether the dev server is running.
  logs     Tail the dev server log.
EOF
}

ensure_deps() {
  cd "$APP_DIR"
  if [[ ! -d node_modules ]] || [[ package.json -nt node_modules ]] || [[ package-lock.json -nt node_modules ]]; then
    echo "Installing dependencies..."
    npm install
  fi
}

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

cmd_start() {
  if is_running; then
    echo "Dev server already running (pid $(cat "$PID_FILE"))."
    return 0
  fi
  ensure_deps
  cd "$APP_DIR"
  : >"$LOG_FILE"
  nohup npm run dev >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
  if is_running; then
    echo "Started (pid $(cat "$PID_FILE")). Logs: $LOG_FILE"
    grep -E "Local:|Network:" "$LOG_FILE" || true
  else
    echo "Failed to start. See $LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
}

cmd_stop() {
  if ! is_running; then
    echo "Dev server not running."
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  # Kill the process group so vite's child processes die too.
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  for _ in {1..20}; do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.25
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -KILL "$pid" 2>/dev/null || true
    pkill -KILL -P "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  echo "Stopped."
}

cmd_status() {
  if is_running; then
    echo "Running (pid $(cat "$PID_FILE"))."
    grep -E "Local:|Network:" "$LOG_FILE" 2>/dev/null || true
  else
    echo "Stopped."
  fi
}

cmd_logs() {
  [[ -f "$LOG_FILE" ]] || { echo "No log file yet."; exit 0; }
  tail -f "$LOG_FILE"
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  ""|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
