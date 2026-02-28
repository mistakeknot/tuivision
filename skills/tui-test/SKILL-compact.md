# TUI Testing (compact)

Guided TUI automation and visual testing using tuivision MCP tools.

## When to Invoke

Testing terminal apps, validating TUI layouts, automating interactive CLI tools, visual regression testing, or debugging terminal rendering.

## Tools

| Tool | Purpose |
|------|---------|
| `spawn_tui` | Start app in virtual terminal |
| `send_input` | Send keystrokes (text, special keys, sequences) |
| `get_screen` | Get terminal state (text/compact/full) |
| `get_screenshot` | Render to PNG or SVG |
| `resize_session` | Change terminal dimensions |
| `close_session` | Clean up session |

## Core Workflow

1. **Spawn** — `spawn_tui command="app" cols=120 rows=40`
   - For Bubble Tea/Charm apps: add `use_script=true answer_queries=true`
2. **Wait** — simple apps: immediate; complex apps: 100-500ms delay
3. **Interact** — `send_input` with `input="text"`, `key="enter"`, or `keys=["tab","tab","enter"]`
4. **Observe** — `get_screen format="text"` (quick), `"compact"` (with cursor), `"full"` (colors/attrs)
5. **Screenshot** — `get_screenshot format="png"` or `format="svg"`
6. **Clean up** — always `close_session` when done

## Special Keys

Navigation: `up/down/left/right/home/end/pageup/pagedown`. Editing: `enter/tab/backspace/delete/escape`. Control: `ctrl+c/d/z/l`. Function: `f1`-`f12`.

## Testing Patterns

- **Assert text**: `get_screen` text format, check for expected strings
- **Visual regression**: screenshot known-good state, compare after changes
- **Interactive flow**: spawn, send input sequence, verify each intermediate state
- **Error handling**: wrap in try/catch, close sessions on failure

## Tips

- Match real-world terminal size (80x24 standard, 120x40 for wider apps)
- Send `ctrl+c` or `q` before `close_session` for graceful shutdown
- Blank screen on Bubble Tea? Use `use_script=true answer_queries=true`
- Use `format="full"` to verify color/attribute rendering

---
*For detailed examples (htop, vim, Bubble Tea) and full key reference, read SKILL.md.*
