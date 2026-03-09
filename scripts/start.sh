#!/usr/bin/env bash
# Bootstrap wrapper for tuivision MCP server.
# Ensures node_modules are installed before starting.
# Called by plugin.json instead of node directly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Auto-install dependencies if missing
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "Installing tuivision dependencies..." >&2
  cd "$PROJECT_DIR"

  # On macOS with Homebrew, set PKG_CONFIG_PATH for native modules
  if [[ "$(uname)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    _brew_prefix=$(brew --prefix 2>/dev/null) || _brew_prefix="/opt/homebrew"
    export PKG_CONFIG_PATH="${_brew_prefix}/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
  fi

  # Install dependencies. Optional deps (canvas, @napi-rs/canvas) may fail
  # on systems without build tools — that's OK, server runs in SVG-only mode.
  npm install --no-fund --no-audit 2>&1 | tail -5 >&2 || {
    echo "Warning: npm install had errors — some features may be limited" >&2
  }

  # Health check: report which backends are available
  node -e "
    async function check() {
      const backends = [];
      try { await import('@napi-rs/canvas'); backends.push('@napi-rs/canvas (prebuilt)'); } catch {}
      try { await import('canvas'); backends.push('canvas (compiled)'); } catch {}
      try { await import('node-pty'); } catch { console.error('ERROR: node-pty failed to load — PTY features will not work'); }
      if (backends.length > 0) {
        console.error('Screenshot backends: ' + backends.join(', '));
      } else {
        console.error('Warning: No canvas backend available — PNG screenshots disabled, SVG only');
      }
    }
    check();
  " 2>&2 || true
fi

exec node "$PROJECT_DIR/dist/index.js" "$@"
