# Tuivision

MCP server for TUI automation and visual testing - "Playwright for TUIs".

Lets Claude Code spawn, interact with, and visually inspect terminal user interfaces during development.

## Use Cases

- **TUI Development**: See your Textual/Bubbletea/Ratatui app as you build it
- **Visual Testing**: Capture screenshots of TUI state for verification
- **Interactive Debugging**: Navigate TUI apps step-by-step while inspecting state
- **Documentation**: Generate terminal screenshots for docs

## Installation

```bash
pnpm install
pnpm build
```

## Usage with Claude Code

Add to your MCP configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tuivision": {
      "command": "node",
      "args": ["/path/to/tuivision/dist/index.js"]
    }
  }
}
```

## Example Workflow

```
User: "Start htop and show me what's using CPU"

Claude: [calls spawn_tui with "htop"]
        [calls get_screenshot to see the UI]
        "I can see htop is running. The process using the most CPU is..."
        [calls send_input with key "q" to quit]
        [calls close_session]
```

## Tools

### spawn_tui

Start a TUI application in a virtual terminal.

```json
{
  "command": "htop",
  "args": ["--sort-key", "PERCENT_CPU"],
  "cols": 80,
  "rows": 24,
  "env": { "TERM": "xterm-256color" },
  "cwd": "/home/user",
  "use_script": false,
  "answer_queries": true
}
```

Returns `session_id` for subsequent operations.

**Tip:** Use `args` for quoted values or paths with spaces to avoid naive splitting.

#### TTY Compatibility Options

Some TUI frameworks (like Bubble Tea/Go, Charm) require additional TTY features:

- **`use_script`**: Wraps command in `script -q -c "..." /dev/null` for `/dev/tty` access
- **`answer_queries`**: Auto-responds to ANSI terminal queries (enabled by default, set `false` to disable)

For Bubble Tea apps, use both:

```json
{
  "command": "./my-bubbletea-app",
  "use_script": true,
  "answer_queries": true
}
```

### send_input

Send keystrokes to a session.

```json
{
  "session_id": "abc-123",
  "key": "down"
}
```

**Named keys**: `enter`, `tab`, `escape`, `backspace`, `delete`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `f1`-`f12`, `ctrl+c`, `ctrl+d`, `ctrl+z`, `ctrl+l`, `space`

**Multiple keys**:
```json
{
  "session_id": "abc-123",
  "keys": ["down", "down", "enter"]
}
```

**Raw text**:
```json
{
  "session_id": "abc-123",
  "input": "hello world"
}
```

### get_screen

Get terminal state as structured data.

```json
{
  "session_id": "abc-123",
  "format": "text"
}
```

Formats:
- `text` - Plain text output
- `compact` - Text with cursor position
- `full` - All cell data with colors and attributes

### get_screenshot

Render terminal to an image.

```json
{
  "session_id": "abc-123",
  "format": "png",
  "font_size": 14,
  "show_cursor": true
}
```

Returns base64-encoded PNG or raw SVG. Claude can "see" the image directly.

### resize_session

Change terminal dimensions.

```json
{
  "session_id": "abc-123",
  "cols": 120,
  "rows": 40
}
```

### list_sessions

List all active sessions with age and PID.

### close_session

Close a session and clean up resources.

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
│                        │                                 │
│                   MCP Protocol                           │
│                        ▼                                 │
│              ┌─────────────────┐                        │
│              │    Tuivision    │                        │
│              └────────┬────────┘                        │
│                       │                                  │
│         ┌─────────────┼─────────────┐                   │
│         ▼             ▼             ▼                   │
│    ┌─────────┐  ┌──────────┐  ┌──────────┐            │
│    │ node-pty│  │ xterm.js │  │  canvas  │            │
│    │  (PTY)  │  │(headless)│  │  (PNG)   │            │
│    └─────────┘  └──────────┘  └──────────┘            │
│         │             │             │                   │
│         └──────┬──────┘             │                   │
│                ▼                    │                   │
│         Screen Buffer ──────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

- **node-pty**: Spawns real PTY processes (same as terminals use)
- **xterm.js headless**: Parses ANSI escape sequences into screen buffer
- **canvas**: Renders the buffer to PNG images

## Requirements

- Node.js 20+
- Build tools for native modules (node-pty, canvas)

**Ubuntu/Debian**:
```bash
apt install build-essential python3 libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**macOS**:
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

## Limitations

- **No mouse support**: Only keyboard input is supported
- **Session timeout**: Sessions auto-close after 30 minutes of inactivity
- **Single user**: Not designed for concurrent access to same session
- **No scrollback**: Only the visible screen is captured

## CLI Usage

Tuivision also includes a CLI for bash-friendly automation:

```bash
# Single-shot mode (spawn, interact, capture in one command)
tuivision run htop --cols 120 --rows 40 --wait 2000 --screenshot /tmp/htop.png

# For Bubble Tea apps, use --script and --answer-queries
tuivision run "./my-app tui" --script --answer-queries --screenshot /tmp/app.png

# Daemon mode for persistent sessions
tuivision daemon start
tuivision spawn "./my-app" --script --answer-queries
tuivision screen <session-id>
tuivision close <session-id>
```

## License

MIT
