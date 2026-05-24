#!/usr/bin/env bash
set -euo pipefail

JAR="kavach.jar"
PORT_FILE="kavach.port"
FALLBACK_URL="http://127.0.0.1:8080"
MAX_WAIT=30

open_browser() {
    local url="$1"
    # Try platform-specific browser launchers in order
    if command -v xdg-open &>/dev/null; then
        xdg-open "$url"
    elif command -v open &>/dev/null; then
        open "$url"
    else
        echo "Open your browser and navigate to: $url"
    fi
}

# --- If the app is already running, just open the browser ---
if [[ -f "$PORT_FILE" ]]; then
    LIVE_PORT=$(<"$PORT_FILE")
    echo "Kavach is already running on port $LIVE_PORT."
    open_browser "http://127.0.0.1:$LIVE_PORT"
    exit 0
fi

# --- Back up the database (keep last 5 copies) ---
if [[ -f kavach.db ]]; then
    TODAY=$(date +%Y-%m-%d)
    cp kavach.db "kavach.db.backup-$TODAY"
    # Prune: keep only the 5 most recent backup files
    ls -t kavach.db.backup-* 2>/dev/null | tail -n +6 | xargs -r rm --
fi

# --- Start the application in the background ---
echo "Starting Kavach..."
java -jar "$JAR" &
APP_PID=$!

# --- Wait for the port file to appear ---
WAITED=0
until [[ -f "$PORT_FILE" ]]; do
    if (( WAITED >= MAX_WAIT )); then
        echo "Kavach did not start in ${MAX_WAIT}s. Opening default URL."
        open_browser "$FALLBACK_URL"
        exit 1
    fi
    sleep 1
    (( WAITED++ )) || true
done

PORT=$(<"$PORT_FILE")
echo "Kavach is ready on port $PORT (pid $APP_PID)."
open_browser "http://127.0.0.1:$PORT"
