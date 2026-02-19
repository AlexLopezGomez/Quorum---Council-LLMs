#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCENARIO=${1:-"scenarios/silent-failures.json"}

echo "=== Quorum Demo ==="
echo ""

# Start chatbot in background
echo "Starting demo chatbot..."
cd "$SCRIPT_DIR/rag-chatbot"
npm install --silent 2>/dev/null
node server.js &
CHATBOT_PID=$!

cleanup() {
  echo ""
  echo "Stopping chatbot (PID $CHATBOT_PID)..."
  kill $CHATBOT_PID 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

# Run scenario
echo "Running scenario: $SCENARIO"
echo ""
cd "$SCRIPT_DIR"
node run-scenario.js "$SCENARIO"

echo ""
echo "=== Demo Complete ==="
echo "Open http://localhost:5173 to see results in the Quorum dashboard."
