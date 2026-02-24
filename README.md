# tuivision

TUI automation and visual testing for Claude Code — Playwright for terminal applications.

## What This Does

tuivision lets Claude spawn TUI apps in virtual terminals, send keystrokes, read screen state, and capture screenshots as PNG or SVG. It's an MCP server backed by node-pty (real PTY processes), xterm.js headless (ANSI parsing), and node-canvas (image rendering). The same stack that powers VS Code's terminal, minus the UI.

Useful for TUI development (see your Textual/Bubbletea/Ratatui app as you build it), visual testing (capture screenshots for verification), interactive debugging (step through TUI state), and documentation (generate terminal screenshots that aren't faked).

## Installation

First, add the [interagency marketplace](https://github.com/mistakeknot/interagency-marketplace) (one-time setup):

```bash
/plugin marketplace add mistakeknot/interagency-marketplace
```

Then install the plugin:

```bash
/plugin install tuivision
```

Requires Node.js 20+ and system dependencies for canvas rendering:

**Ubuntu/Debian:**
```bash
apt install build-essential python3 libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

## MCP Tools

- **spawn_tui** — Start a TUI app in a virtual terminal (returns session_id)
- **send_input** — Send keystrokes: named keys (`enter`, `tab`, `ctrl+c`, `f1`-`f12`), key sequences, or raw text
- **get_screen** — Terminal state as text, compact (with cursor), or full (all cell data with colors)
- **get_screenshot** — Render to base64 PNG or raw SVG (Claude can "see" the image directly)
- **resize_session** — Change terminal dimensions
- **list_sessions** / **close_session** — Session management

### Bubble Tea / Charm Compatibility

Some TUI frameworks need extra TTY features. For Bubble Tea apps, use both `use_script` (wraps in `script` for `/dev/tty` access) and `answer_queries` (auto-responds to ANSI terminal queries):

```json
{ "command": "./my-bubbletea-app", "use_script": true, "answer_queries": true }
```

## CLI Usage

tuivision also includes a CLI for bash-friendly automation:

```bash
# Single-shot: spawn, wait, capture, done
tuivision run htop --cols 120 --rows 40 --wait 2000 --screenshot /tmp/htop.png

# Daemon mode for persistent sessions
tuivision daemon start
tuivision spawn "./my-app" --script --answer-queries
tuivision screen <session-id>
tuivision close <session-id>
```

## Limitations

- Keyboard only — no mouse support
- Sessions auto-close after 30 minutes of inactivity
- Single user per session (not designed for concurrent access)
- Visible screen only — no scrollback capture

## License

MIT
