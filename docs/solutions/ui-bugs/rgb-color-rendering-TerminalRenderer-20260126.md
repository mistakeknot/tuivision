---
module: tuivision
date: 2026-01-26
problem_type: ui_bug
component: terminal_renderer
symptoms:
  - "Weird color blank tiles in TUI screenshots"
  - "RGB/true color backgrounds rendered incorrectly"
  - "Bubble Tea apps showing wrong background colors"
root_cause: incorrect_api_usage
severity: high
tags: [xterm-js, rgb-colors, true-color, terminal-rendering]
---

# RGB Color Rendering Incorrect in TUI Screenshots

## Problem

TUI screenshots showed "weird color blank tiles" - areas where background colors should render correctly were showing incorrect colors or artifacts. This affected apps using RGB/true color (24-bit) like Bubble Tea (Go), praude, and Claude Code (Ink).

## Symptoms

- Background color rectangles appearing in wrong colors
- RGB-colored text and backgrounds not matching the actual terminal output
- Apps using true color (24-bit RGB via `\x1b[38;2;R;G;Bm`) rendering incorrectly
- 16-color and 256-color palette apps rendering correctly (htop, vim)

## Investigation

1. **Initial observation**: User reported "weird color blank tiles" in praude screenshot
2. **Hypothesis**: RGB color extraction was failing
3. **Testing**: Created test script to examine xterm.js cell color values
4. **Discovery**: `getFgColor()` and `getBgColor()` return `-1` for RGB colors

## Root Cause

xterm.js headless stores colors in raw `fg`/`bg` cell properties with a specific encoding format that the API methods don't handle properly:

**Color encoding format**: `MMRRGGBB` (32-bit integer)
- **MM (top byte)**: Contains color mode in bits 0-1, attribute flags in higher bits
  - Mode 0: Default color
  - Mode 1: 16-color palette
  - Mode 2: 256-color palette
  - Mode 3: RGB true color (24-bit)
- **RRGGBB (lower 3 bytes)**: RGB values for mode 3, or color index for modes 1-2

**Example values discovered**:
- `fg: 0x0379a2f7` = Mode 3 (RGB) + color `#79a2f7` (blue/purple)
- `fg: 0x0bff0000` = Mode 3 (RGB) + bold flag + color `#ff0000` (red)
- `fg: 0x11000003` = Mode 1 (16-color) + underline flag + color index 3 (yellow)

The existing code used:
```typescript
const fgColor = cell.getFgColor();  // Returns -1 for RGB!
const isFgDefault = cell.isFgDefault();
const fg = this.colorToHex(fgColor, isFgDefault, "#ffffff");
```

This only worked for palette colors (0-255), not RGB true colors.

## Solution

Access raw `cell.fg`/`cell.bg` properties directly and decode using bit masking:

```typescript
/**
 * Extract color from xterm.js cell raw fg/bg value
 * Format is MMRRGGBB where:
 * - MM (top byte) contains color mode in bits 0-1 and attribute flags in higher bits
 * - Color modes: 0=default, 1=16-color, 2=256-color, 3=RGB
 */
private extractColor(rawValue: number, defaultColor: string): string {
  // Extract mode byte and get color mode from bits 0-1
  const modeByte = (rawValue >> 24) & 0xff;
  const colorMode = modeByte & 0x03;

  // Mode 0: default color
  if (colorMode === 0) {
    return defaultColor;
  }

  // Mode 3: RGB true color (24-bit)
  if (colorMode === 3) {
    const r = (rawValue >> 16) & 0xff;
    const g = (rawValue >> 8) & 0xff;
    const b = rawValue & 0xff;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Mode 1/2: palette colors - use color index from lower byte
  const colorIndex = rawValue & 0xff;
  // ... palette lookup logic
}
```

And update the screen state extraction:
```typescript
// OLD (broken for RGB):
const fgColor = cell.getFgColor();
const isFgDefault = cell.isFgDefault();
const fg = this.colorToHex(fgColor, isFgDefault, "#ffffff");

// NEW (works for all color modes):
const cellAny = cell as unknown as { fg: number; bg: number };
const fg = this.extractColor(cellAny.fg, "#ffffff");
const bg = this.extractColor(cellAny.bg, "#000000");
```

Also fixed attribute detection - `isBold()` etc. return bitmask values, not 0/1:
```typescript
// OLD:
const bold = cell.isBold() === 1;

// NEW:
const bold = !!cell.isBold();
```

## Files Changed

- `src/terminal-renderer.ts`: Added `extractColor()` method, updated `getScreenState()`

## Prevention

1. **Document xterm.js internals**: The color encoding format is not well-documented in xterm.js API docs
2. **Test with RGB colors**: Always test terminal rendering with apps that use true color (Bubble Tea, modern TUIs)
3. **Don't trust API methods blindly**: xterm.js headless has different behavior than the full terminal package

## Verification

Tested with:
- **Autarch** (Bubble Tea/Go) - Tab highlights render correctly
- **Praude** (Bubble Tea/Go) - Cyan highlights, blue headers, dark panels all correct
- **Claude Code** (Ink/Node.js) - Orange logo, yellow warnings render properly

## Related Issues

- Also required `--script` and `--answer-queries` flags for Bubble Tea apps (separate fix in same session)

## Critical Pattern

This issue is documented in Required Reading: [Pattern 1: xterm.js RGB Color Extraction](../patterns/critical-patterns.md#pattern-1-xtermjs-rgb-color-extraction)
