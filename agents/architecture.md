# Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                       tuivision                          │
├─────────────────────────────────────────────────────────┤
│  MCP Tools:                                              │
│  - spawn_tui    → Start a TUI in virtual terminal       │
│  - send_input   → Send keystrokes (raw or named keys)   │
│  - get_screen   → Get terminal state as JSON/text       │
│  - get_screenshot → Render to PNG/SVG image             │
│  - resize_session → Change terminal dimensions          │
│  - list_sessions  → List active sessions                │
│  - close_session  → Clean up a session                  │
├─────────────────────────────────────────────────────────┤
│  Core Components:                                        │
│  - SessionManager: PTY lifecycle, session tracking      │
│  - TerminalRenderer: xterm.js headless wrapper          │
│  - screenshot.ts: PNG/SVG rendering via node-canvas     │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
tuivision/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── session-manager.ts    # PTY session management
│   ├── terminal-renderer.ts  # xterm.js headless wrapper
│   ├── screenshot.ts         # Image rendering
│   └── tools/                # MCP tool implementations
│       ├── spawn.ts
│       ├── input.ts
│       ├── screen.ts
│       ├── screenshot.ts
│       ├── resize.ts
│       ├── list.ts
│       └── close.ts
├── dist/                     # Compiled output
├── package.json
└── tsconfig.json
```

## Dependencies

| Package | Purpose |
|---------|---------|
| @modelcontextprotocol/sdk | MCP server framework |
| @xterm/headless | Terminal emulation (ANSI parsing) |
| node-pty | PTY management |
| canvas | PNG rendering |
| zod | Input validation |
| uuid | Session IDs |
