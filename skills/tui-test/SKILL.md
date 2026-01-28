---
name: tui-test
description: Guided TUI automation and visual testing workflow. Use when testing terminal applications, validating TUI layouts, or automating interactive CLI tools.
version: 0.1.0
---

# TUI Testing Skill

This skill guides you through testing terminal user interfaces using tuivision's MCP tools.

## When to Use

- Testing a TUI application (htop, vim, custom ncurses apps)
- Validating terminal output and layout
- Automating interactive CLI workflows
- Visual regression testing for terminal apps
- Debugging terminal rendering issues

## Available Tools

The tuivision MCP server provides these tools:

| Tool | Purpose |
|------|---------|
| `spawn_tui` | Start a TUI app in a virtual terminal |
| `send_input` | Send keystrokes (text, arrows, ctrl+c, etc.) |
| `get_screen` | Get terminal state as text or structured data |
| `get_screenshot` | Render terminal to PNG or SVG image |
| `resize_session` | Change terminal dimensions |
| `list_sessions` | Show all active sessions |
| `close_session` | Clean up a session |

## Workflow

### 1. Spawn the Application

```
spawn_tui command="htop" cols=120 rows=40
```

Returns a `session_id` for subsequent operations.

**For Bubble Tea / Charm apps** (Go TUI frameworks), add TTY compatibility flags:

```
spawn_tui command="./my-bubbletea-app" cols=120 rows=40 use_script=true answer_queries=true
```

- `use_script`: Wraps in `script` command for `/dev/tty` access
- `answer_queries`: Auto-responds to ANSI terminal queries

### 2. Wait for Startup

After spawning, give the app time to initialize:
- Simple apps: immediate
- Complex apps (htop, vim): 100-500ms delay before reading screen

### 3. Interact

Send input using `send_input`:

```
# Type text
send_input session_id="..." input="hello world"

# Special keys
send_input session_id="..." key="enter"
send_input session_id="..." key="ctrl+c"
send_input session_id="..." key="up"

# Sequence of keys
send_input session_id="..." keys=["tab", "tab", "enter"]
```

**Special keys supported:**
- Navigation: `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`
- Editing: `enter`, `tab`, `backspace`, `delete`, `escape`
- Control: `ctrl+c`, `ctrl+d`, `ctrl+z`, `ctrl+l`
- Function: `f1` through `f12`

### 4. Observe State

Get terminal content:

```
# Quick text view
get_screen session_id="..." format="text"

# With cursor position
get_screen session_id="..." format="compact"

# Full cell data (colors, attributes)
get_screen session_id="..." format="full"
```

### 5. Visual Verification

Take screenshots for visual inspection:

```
# PNG screenshot (returned as base64 image)
get_screenshot session_id="..." format="png"

# SVG for scalable output
get_screenshot session_id="..." format="svg" font_size=16
```

### 6. Clean Up

Always close sessions when done:

```
close_session session_id="..."
```

## Testing Patterns

### Assert Text Content

1. `get_screen` with `format="text"`
2. Check for expected strings in output
3. Verify cursor position if needed

### Visual Regression

1. Take screenshot of known-good state
2. After changes, take new screenshot
3. Compare visually or with diff tools

### Interactive Flow Testing

1. Spawn app
2. Send navigation/input sequence
3. Verify each intermediate state
4. Validate final state

### Error Handling

- Always wrap in try/catch
- Close sessions on failure
- Check for app crash via `get_screen` returning empty/error

## Tips

- **Timing**: TUI apps need time to render. Add small delays between input and screen reads.
- **Terminal size**: Match real-world dimensions (80x24 is standard, 120x40 for wider apps).
- **Colors**: Use `get_screen format="full"` to verify color/attribute rendering.
- **Exit cleanly**: Send `ctrl+c` or `q` before `close_session` for graceful app shutdown.
- **Bubble Tea / Charm**: Always use `use_script=true` and `answer_queries=true` for Go TUI apps.
- **Blank screen?** If app shows blank, it likely needs the TTY flags above.

## Example: Test htop

```
1. spawn_tui command="htop" cols=120 rows=40
2. [wait 200ms]
3. get_screenshot session_id="..." format="png"
4. send_input session_id="..." key="q"
5. close_session session_id="..."
```

## Example: Test vim

```
1. spawn_tui command="vim test.txt" cols=80 rows=24
2. send_input session_id="..." key="i"  # insert mode
3. send_input session_id="..." input="Hello, World!"
4. send_input session_id="..." key="escape"
5. get_screen session_id="..." format="text"
6. send_input session_id="..." keys=[":","q","!","enter"]
7. close_session session_id="..."
```

## Example: Test Bubble Tea App

Bubble Tea apps (Go) require TTY compatibility flags:

```
1. spawn_tui command="./my-bubbletea-app" cols=80 rows=24 use_script=true answer_queries=true
2. [wait 500ms for app to initialize]
3. get_screenshot session_id="..." format="png"
4. send_input session_id="..." key="down"
5. get_screen session_id="..." format="text"
6. send_input session_id="..." key="q"
7. close_session session_id="..."
```

**Why these flags?** Bubble Tea queries terminal capabilities (cursor position, colors) before rendering. Without responses, the app hangs waiting. `use_script` provides `/dev/tty` access, and `answer_queries` auto-responds to ANSI queries.
