#!/usr/bin/env bash
# One-command private link: build (if needed) -> next start -> ngrok tunnel.
# Usage:
#   ./serve.sh              # serve current build, random ngrok URL
#   ./serve.sh --build      # rebuild first
#   NGROK_DOMAIN=foo.ngrok-free.app ./serve.sh   # use a reserved static domain
# Basic-auth creds live in .ngrok-auth (user:pass). A reserved domain may also be
# stored in .ngrok-domain instead of the env var.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"

PORT="${PORT:-3320}"
AUTH="$(cat .ngrok-auth 2>/dev/null || echo 'recto:WulfxRLEml')"
DOMAIN="${NGROK_DOMAIN:-$(cat .ngrok-domain 2>/dev/null || true)}"

if ! command -v ngrok >/dev/null; then
  echo "ngrok not found. Install: brew install ngrok" >&2; exit 1
fi

# Build if asked, or if there's no production build yet.
if [[ "${1:-}" == "--build" || ! -d .next ]]; then
  echo "→ building…"; npm run build
fi

# Start the prod server if nothing is already listening on $PORT.
if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  echo "→ starting next on :$PORT…"
  PORT="$PORT" nohup npm run start >/tmp/icon-playground-server.log 2>&1 &
  echo $! > .serve.pid
  for _ in $(seq 1 20); do
    curl -s -o /dev/null "http://localhost:$PORT/" && break || sleep 0.5
  done
fi

# (Re)start the tunnel.
pkill -f "ngrok http $PORT" 2>/dev/null || true
sleep 1
DOMAIN_ARG=()
[[ -n "$DOMAIN" ]] && DOMAIN_ARG=(--url "$DOMAIN")
echo "→ opening tunnel…"
nohup ngrok http "$PORT" --basic-auth "$AUTH" "${DOMAIN_ARG[@]}" --log=stdout \
  >/tmp/icon-playground-ngrok.log 2>&1 &
disown

# Read back the public URL from the agent API.
for _ in $(seq 1 20); do
  URL="$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/.*"https/https/;s/"$//')"
  [[ -n "${URL:-}" ]] && break || sleep 0.5
done

echo
echo "  Private link : ${URL:-<failed — see /tmp/icon-playground-ngrok.log>}"
echo "  Basic auth   : $AUTH"
echo "  Stop         : ./stop.sh"
