#!/usr/bin/env bash
# Bootstrap wrapper for tuivision MCP server.
# Ensures node_modules are installed before starting.
# Called by .mcp.json instead of node directly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Auto-install dependencies if missing
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  # Check for system deps needed by native modules (canvas needs libgif)
  if ! pkg-config --exists libgif 2>/dev/null; then
    if command -v apt-get >/dev/null 2>&1; then
      echo "Installing system dependencies for canvas..." >&2
      sudo apt-get install -y libgif-dev >/dev/null 2>&1 || {
        echo "Warning: could not install libgif-dev (canvas screenshots may not work)" >&2
      }
    else
      echo "Warning: libgif-dev not found — canvas screenshots may not work" >&2
    fi
  fi

  echo "Installing tuivision dependencies..." >&2
  cd "$PROJECT_DIR"
  npm install --no-fund --no-audit 2>&1 | tail -1 >&2
fi

exec node "$PROJECT_DIR/dist/index.js" "$@"
