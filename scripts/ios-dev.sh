#!/usr/bin/env bash
#
# One-command iOS Simulator dev loop with live reload.
#
# Mirror of scripts/android-dev.sh for iOS Simulator.
#
# Env overrides:
#   SIM=<device name>   simulator to use (default: iPhone 16)
#   NEXT_PORT=<n>       Next.js port (default: 3000)
#   LAN_IP=<ip>         override host (default: localhost — simulators
#                       share the Mac's network namespace)
#   CAP_DEV_URL=<url>   full WebView dev URL override, e.g.
#                       https://<slug>.local.<your-domain>/

set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"

SIM_NAME="${SIM:-iPhone 16}"
NEXT_PORT="${NEXT_PORT:-7834}"
DEV_HOST="${LAN_IP:-localhost}"

NEXT_PID=""

cleanup() {
  echo ""
  echo "Stopping Next.js dev server"
  if [ -n "$NEXT_PID" ]; then
    kill -TERM "$NEXT_PID" 2>/dev/null || true
  fi
  sleep 0.3
  lsof -ti:"$NEXT_PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
  wait 2>/dev/null || true
  echo "   (simulator left running — next dev:ios is instant)"
}
trap cleanup EXIT INT TERM

if lsof -ti:"$NEXT_PORT" > /dev/null 2>&1; then
  echo "Clearing stale process on port $NEXT_PORT"
  lsof -ti:"$NEXT_PORT" | xargs kill -9 2>/dev/null || true
  sleep 0.3
fi

# ── Simulator ─────────────────────────────────────────────
if xcrun simctl list devices | grep -q "Booted"; then
  BOOTED_NAME=$(xcrun simctl list devices | grep "Booted" | head -1 | sed -E 's/^[[:space:]]+(.*) \([A-F0-9-]+\).*/\1/')
  echo "Simulator already booted: $BOOTED_NAME"
else
  echo "Booting simulator: $SIM_NAME"
  UDID=$(xcrun simctl list devices available \
    | grep -F "$SIM_NAME" \
    | head -1 \
    | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
  if [ -z "$UDID" ]; then
    echo "Simulator '$SIM_NAME' not found."
    echo "Available: xcrun simctl list devices available"
    exit 1
  fi
  xcrun simctl boot "$UDID"
  open -a Simulator
  until xcrun simctl list devices | grep -F "$UDID" | grep -q "Booted"; do
    sleep 1
  done
  echo "Simulator ready"
fi

# ── Fallback bundle ───────────────────────────────────────
if [ ! -d "$REPO/packages/client/out" ] || [ ! -d "$REPO/ios/App/App/public" ]; then
  echo "Building fallback static export (first run)..."
  (cd "$REPO" && pnpm build:mobile)
fi

# ── Next.js dev server ────────────────────────────────────
CAP_DEV_URL="${CAP_DEV_URL:-http://$DEV_HOST:$NEXT_PORT}"
echo "Starting Next.js dev server at $CAP_DEV_URL"
(cd "$REPO/packages/client" && npx next dev --hostname 0.0.0.0 --port "$NEXT_PORT") &
NEXT_PID=$!

echo "   waiting for Next.js to answer..."
READY_TIMEOUT=60
SECS=0
until curl -s -o /dev/null "http://localhost:$NEXT_PORT"; do
  sleep 0.5
  SECS=$((SECS + 1))
  if [ $SECS -ge $((READY_TIMEOUT * 2)) ]; then
    echo "Next.js didn't start in ${READY_TIMEOUT}s."
    exit 1
  fi
done
echo "Next.js ready"

# ── Capacitor sync + deploy ───────────────────────────────
echo "Syncing Capacitor (server.url = $CAP_DEV_URL)"
export CAP_DEV_URL
(cd "$REPO" && npx cap sync ios)

SIM_UDID=$(xcrun simctl list devices | grep "Booted" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
if [ -z "$SIM_UDID" ]; then
  echo "No booted simulator found."
  exit 1
fi

echo "Building + launching on $SIM_UDID..."
(cd "$REPO" && npx cap run ios --target "$SIM_UDID")

echo ""
echo "Live-reload active. Ctrl+C to stop (simulator stays running)."
wait "$NEXT_PID"
