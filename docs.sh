#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
REQS="$SCRIPT_DIR/requirements.txt"
STAMP="$VENV_DIR/.deps-installed"
PID_FILE="$SCRIPT_DIR/.mkdocs.pid"
LOG_FILE="$SCRIPT_DIR/.mkdocs.log"
PORT="${MKDOCS_PORT:-8000}"
HOST="${MKDOCS_HOST:-127.0.0.1}"

usage() {
  cat <<EOF
Usage: $(basename "$0") {start|stop|restart|status|logs|build}

  start    Create venv + install deps if missing, then serve the MkDocs site
           in the background at http://$HOST:$PORT.
  stop     Stop the running mkdocs server.
  restart  Stop (if running) then start.
  status   Show whether mkdocs is running.
  logs     Tail the mkdocs server log.
  build    One-shot static build into site/ (no server).

Environment:
  MKDOCS_PORT  (default 8000)
  MKDOCS_HOST  (default 127.0.0.1)
EOF
}

ensure_venv() {
  if [[ ! -x "$VENV_DIR/bin/python" ]]; then
    echo "Creating virtualenv at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip
  fi
}

ensure_deps() {
  ensure_venv
  if [[ ! -f "$STAMP" ]] || [[ "$REQS" -nt "$STAMP" ]]; then
    echo "Installing Python dependencies..."
    "$VENV_DIR/bin/pip" install --quiet -r "$REQS"
    touch "$STAMP"
  fi
}

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

cmd_start() {
  if is_running; then
    echo "mkdocs already running (pid $(cat "$PID_FILE")) at http://$HOST:$PORT"
    return 0
  fi
  ensure_deps
  cd "$SCRIPT_DIR"
  : >"$LOG_FILE"
  nohup "$VENV_DIR/bin/mkdocs" serve --dev-addr "$HOST:$PORT" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
  if is_running; then
    echo "Started (pid $(cat "$PID_FILE")) at http://$HOST:$PORT"
    echo "Logs: $LOG_FILE"
  else
    echo "Failed to start. See $LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
}

cmd_stop() {
  if ! is_running; then
    echo "mkdocs not running."
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
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
    echo "Running (pid $(cat "$PID_FILE")) at http://$HOST:$PORT"
  else
    echo "Stopped."
  fi
}

cmd_logs() {
  [[ -f "$LOG_FILE" ]] || { echo "No log file yet."; exit 0; }
  tail -f "$LOG_FILE"
}

cmd_build() {
  ensure_deps
  cd "$SCRIPT_DIR"
  "$VENV_DIR/bin/mkdocs" build --strict
  echo "Built into $SCRIPT_DIR/site/"
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  build)   cmd_build ;;
  ""|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
