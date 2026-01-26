# Tuivision

> See `AGENTS.md` for full development guide.

## Overview

MCP server for TUI automation and visual testing - "Playwright for TUIs". Lets Claude Code spawn, interact with, and screenshot terminal applications.

## Status

Development complete. Ready for Claude Code integration.

## Quick Commands

```bash
# Build
npm run build

# Test locally
node -e "const {SessionManager}=require('./dist/session-manager.js'); ..."

# Run as MCP server (via Claude Code)
node dist/index.js
```

## Design Decisions (Do Not Re-Ask)

- Uses xterm.js headless for ANSI parsing (battle-tested, same as VS Code terminal)
- node-pty for cross-platform PTY management
- node-canvas for PNG rendering (requires system deps)
- Sessions auto-cleanup after 30 minutes
- MCP SDK v1.0.0 with StdioServerTransport
