# MCP Tools Reference

## spawn_tui

```json
{
  "command": "htop",
  "cols": 80,
  "rows": 24,
  "env": { "TERM": "xterm-256color" },
  "cwd": "/home/user",
  "use_script": false,
  "answer_queries": false
}
```

Returns: `{ session_id, pid, cols, rows }`

**TTY Compatibility** (for Bubble Tea, Charm, and similar frameworks):
- `use_script`: Wraps command in `script` for `/dev/tty` access
- `answer_queries`: Auto-responds to ANSI terminal queries (ESC[6n, ESC]11;?, etc.)

For Bubble Tea apps, set both to `true`.

## send_input

```json
{
  "session_id": "abc-123",
  "input": "hello",           // Raw text
  "key": "enter",             // Named key
  "keys": ["up", "up", "enter"]  // Multiple keys
}
```

Named keys: `enter`, `tab`, `escape`, `backspace`, `delete`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `f1`-`f12`, `ctrl+c`, `ctrl+d`, `ctrl+z`, `ctrl+l`, etc.

## get_screen

```json
{
  "session_id": "abc-123",
  "format": "text"  // or "compact" or "full"
}
```

- `text`: Plain text only
- `compact`: Text + cursor position
- `full`: Complete cell data with colors and attributes

## get_screenshot

```json
{
  "session_id": "abc-123",
  "format": "png",     // or "svg"
  "font_size": 14,
  "show_cursor": true
}
```

Returns: Image content block (base64 PNG or raw SVG)
