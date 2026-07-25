#!/usr/bin/env bash
# One-command private link: build (if needed) -> next start -> ngrok tunnel.
# Usage:
#   ./serve.sh              # serve current build, random ngrok URL
#   ./serve.sh --build      # rebuild first
#   NGROK_DOMAIN=foo.ngrok-free.app ./serve.sh
#
# Auth (required — no credentials are committed):
#   echo 'user:pass' > .ngrok-auth   # gitignored
#   # or: NGROK_BASIC_AUTH='user:pass' ./serve.sh
# Optional reserved domain: .ngrok-domain (gitignored) or NGROK_DOMAIN.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PORT="${PORT:-3320}"

if [[ -n "${NGROK_BASIC_AUTH:-}" ]]; then
  AUTH="$NGROK_BASIC_AUTH"
elif [[ -f .ngrok-auth ]]; then
  AUTH="$(tr -d '\r\n' < .ngrok-auth)"
else
  echo "Missing basic-auth credentials." >&2
  echo "  Create .ngrok-auth with 'user:pass' (gitignored), or set NGROK_BASIC_AUTH." >&2
  exit 1
fi
if [[ "$AUTH" != *:* ]]; then
  echo "Auth must be 'user:pass' format." >&2
  exit 1
fi
AUTH_USER="${AUTH%%:*}"
DOMAIN="${NGROK_DOMAIN:-$(cat .ngrok-domain 2>/dev/null || true)}"

if ! command -v ngrok >/dev/null; then
  echo "ngrok not found. Install: brew install ngrok" >&2; exit 1
fi

# Build if asked, or if there's no production build yet.
if [[ "${1:-}" == "--build" || ! -d .next ]]; then
  echo "→ building…"; npm run build
fi

# Start the prod server if nothing is already listening on $PORT.
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "→ starting next on :$PORT…"
  PORT="$PORT" nohup npm run start >./.serve-server.log 2>&1 &
  echo $! > .serve.pid
  for _ in $(seq 1 20); do
    curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break || sleep 0.5
  done
fi

# (Re)start the tunnel.
pkill -f "ngrok http $PORT" 2>/dev/null || true
sleep 1
DOMAIN_ARG=()
[[ -n "$DOMAIN" ]] && DOMAIN_ARG=(--url "$DOMAIN")
echo "→ opening tunnel…"
nohup ngrok http "$PORT" --basic-auth "$AUTH" "${DOMAIN_ARG[@]}" --log=stdout \
  >./.serve-ngrok.log 2>&1 &
disown

# Read back the public URL from the agent API.
for _ in $(seq 1 20); do
  URL="$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/.*"https/https/;s/"$//')"
  [[ -n "${URL:-}" ]] && break || sleep 0.5
done

echo
echo "  Private link : ${URL:-<failed — see .serve-ngrok.log>}"
echo "  Basic auth   : ${AUTH_USER}:********"
echo "  Stop         : ./stop.sh"
