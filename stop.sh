#!/usr/bin/env bash
# Take down the private link: stop the ngrok tunnel and the next server.
set -uo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"

PORT="${PORT:-3320}"
pkill -f "ngrok http $PORT" 2>/dev/null && echo "stopped ngrok tunnel" || echo "no ngrok tunnel"
pkill -f "next start" 2>/dev/null && echo "stopped next server" || echo "no next server"
rm -f .serve.pid
