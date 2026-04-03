# Annotated Format Specification v1

The `annotated` format for `get_screen` encodes terminal state as text with inline semantic markers, optimized for LLM consumption at ~400-800 tokens per 80x24 screen.

## Response Envelope

Every `get_screen` response wraps content in a typed envelope:

```json
{
  "format": "annotated",
  "schema": 1,
  "content": "[screen 80x24 cursor=12,8]\n[g]user@host[/]:~$ ls\n..."
}
```

The `schema` field enables forward-compatible evolution. Consumers should check `schema` and handle unknown versions gracefully.

## Structural Preamble

The first line of annotated content is always a structural preamble:

```
[screen WxH cursor=X,Y]
```

- `W`, `H`: terminal dimensions (columns, rows)
- `X`, `Y`: cursor position (0-indexed column, row)

This provides spatial context before the detail stream. Consumers can build a screen model from this line alone.

## Marker Vocabulary

### Color Markers

Single-character codes mapped to the 16-color terminal palette. Lowercase = standard, uppercase = bright.

| Code | Color | Semantic Group |
|------|-------|---------------|
| `r` | Red | error |
| `g` | Green | success |
| `b` | Blue | info |
| `c` | Cyan | info |
| `m` | Magenta | accent |
| `y` | Yellow | warning |
| `w` | White | neutral |
| `k` | Black | neutral |
| `R` | Bright Red | error |
| `G` | Bright Green | success |
| `B` | Bright Blue | info |
| `C` | Bright Cyan | info |
| `M` | Bright Magenta | accent |
| `Y` | Bright Yellow | warning |
| `W` | Bright White | neutral |
| `K` | Bright Black (Gray) | neutral |

Palette indices 0-15 map directly to these codes regardless of the terminal's configured RGB values. For 256-color and truecolor, the nearest of these 16 is selected using CIELAB perceptual distance.

### Style Markers

Non-letter characters to avoid collision with bright color codes:

| Symbol | Meaning |
|--------|---------|
| `+` | Bold |
| `_` | Underline |
| `~` | Dim |
| `^` | Inverse (SGR 7) |

Note: `^` indicates the terminal's SGR 7 inverse attribute. Not all TUI frameworks use SGR 7 for selection — many use explicit fg/bg colors instead. The `^` marker fires only when the terminal application explicitly set the inverse attribute.

### Reserved (not emitted in v1)

| Symbol | Future Meaning |
|--------|---------------|
| `!` | Focus (receives keyboard input) |
| `?` | Changed since previous capture |
| `#` | Selection (application-level) |

## Composition

Attributes combine in a single bracket. `[/]` closes all open markers.

```
[r+^]Error: file not found[/]
```

This means: red, bold, inverse text. The closing `[/]` resets all attributes.

Rules:
- Color code (if any) comes first: `[r+]`, not `[+r]`
- Multiple style markers combine freely: `[r+_^]` = red, bold, underline, inverse
- `[/]` always closes ALL open markers (no nesting, no partial close)
- Markers do not nest. To change style mid-span, close and reopen: `[r]red[/] [g]green[/]`

## Escaping

The only control character is `[`. Literal `[` in terminal content is escaped as `[[`.

```
array[[0]] = value    ← terminal shows: array[0] = value
```

No other escaping is needed. `]`, `/`, and all other characters are literal.

## Density Threshold

When >60% of non-space cells share the same foreground color (the "modal color"), markers for cells matching the modal color are suppressed. This prevents marker noise on syntax-highlighted screens where most text shares a dominant color.

The modal color is computed per-screen, per-capture. Cells matching the modal color appear as unmarked text; only deviating cells receive markers.

## Semantic Color Groups

The `SEMANTIC_COLOR_GROUPS` constant maps color codes to functional categories:

| Group | Colors | Typical Meaning |
|-------|--------|----------------|
| error | `r`, `R` | Errors, failures, critical |
| success | `g`, `G` | Pass, complete, healthy |
| warning | `y`, `Y` | Caution, degraded |
| info | `b`, `B`, `c`, `C` | Informational, links |
| accent | `m`, `M` | Highlights, special |
| neutral | `w`, `W`, `k`, `K` | Normal text, backgrounds |

These groups are advisory — they reflect common terminal conventions but are not universal. Applications may use colors differently.

## Token Budget

Target: 400-800 tokens per 80x24 screen (cl100k_base tokenizer).

### Benchmark Results

| Screen Type | Styled Runs | Marker Tokens | Text Tokens | Total | Notes |
|------------|-------------|---------------|-------------|-------|-------|
| Empty shell (3 lines) | 2-4 | 8-16 | 30-50 | ~60 | Mostly whitespace |
| htop (dense, 80x24) | 80-150 | 320-600 | 200-300 | ~600-700 | Dense coloring, density threshold helps |
| vim (syntax highlight) | 100-200 | 400-800 | 150-250 | ~650-800 | Varies heavily by content |

Each marker pair `[x]...[/]` costs 4 cl100k tokens: `[x` (1) + `]` (1) + `[/` (1) + `]` (1). Combined markers like `[r+^]` cost 5 tokens: `[r` (1) + `+^` (1) + `]` (1) + `[/` (1) + `]` (1).

For comparison: `full` format costs ~12,000 tokens, SVG costs ~5,000 tokens, `text` costs ~250 tokens.

## Example

Terminal showing a git status output:

```
[screen 80x24 cursor=0,5]
[g]user@host[/]:~/project$ git status
On branch main
Changes not staged for commit:
  [r]modified:   src/index.ts[/]
  [r]modified:   src/utils.ts[/]
[g]nothing to commit[/]
```

~45 tokens for a 6-line screen capture with semantic color information.
