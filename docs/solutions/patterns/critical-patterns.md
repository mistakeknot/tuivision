# Tuivision Critical Patterns

Required reading for anyone working on terminal rendering, color extraction, or xterm.js integration.

---

## Pattern 1: xterm.js RGB Color Extraction

**When this applies:** Extracting foreground/background colors from xterm.js cells

### The Problem

xterm.js API methods `getFgColor()` and `getBgColor()` return `-1` for RGB/true color values. If you use these methods, RGB colors will be incorrectly rendered.

### ❌ WRONG

```typescript
// This FAILS for RGB colors (returns -1)
const fgColor = cell.getFgColor();
const isFgDefault = cell.isFgDefault();
const fg = this.colorToHex(fgColor, isFgDefault, "#ffffff");
```

### ✅ CORRECT

```typescript
// Access raw fg/bg properties and decode the format
const cellAny = cell as unknown as { fg: number; bg: number };
const fg = this.extractColor(cellAny.fg, "#ffffff");
const bg = this.extractColor(cellAny.bg, "#000000");

// Decode format: MMRRGGBB where MM = mode byte, RRGGBB = color
private extractColor(rawValue: number, defaultColor: string): string {
  const modeByte = (rawValue >> 24) & 0xff;
  const colorMode = modeByte & 0x03;  // bits 0-1 = color mode

  if (colorMode === 0) return defaultColor;  // Mode 0: default

  if (colorMode === 3) {  // Mode 3: RGB true color
    const r = (rawValue >> 16) & 0xff;
    const g = (rawValue >> 8) & 0xff;
    const b = rawValue & 0xff;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Mode 1/2: palette - use lower byte as color index
  const colorIndex = rawValue & 0xff;
  return paletteColors[colorIndex];
}
```

### Why This Matters

- Modern TUI frameworks (Bubble Tea, Ink, Charm) use RGB true color extensively
- Screenshots will show wrong colors or artifacts if RGB isn't handled
- The xterm.js API documentation doesn't clearly explain this encoding

### Color Mode Reference

| Mode | Bits 0-1 | Description | Lower bytes contain |
|------|----------|-------------|---------------------|
| 0 | `00` | Default color | N/A |
| 1 | `01` | 16-color palette | Color index (0-15) |
| 2 | `10` | 256-color palette | Color index (0-255) |
| 3 | `11` | RGB true color | `RRGGBB` (24-bit) |

**Note:** Higher bits of mode byte contain attribute flags (bold = 0x08, underline = 0x10, etc.)

**See also:** [rgb-color-rendering-TerminalRenderer-20260126.md](../ui-bugs/rgb-color-rendering-TerminalRenderer-20260126.md)

---

## Pattern 2: xterm.js Attribute Detection

**When this applies:** Checking cell attributes (bold, italic, underline, etc.)

### The Problem

xterm.js `isBold()`, `isItalic()`, etc. return bitmask values, not boolean 0/1.

### ❌ WRONG

```typescript
// This fails - isBold() returns large numbers like 134217728, not 1
const bold = cell.isBold() === 1;
```

### ✅ CORRECT

```typescript
// Use truthiness check instead
const bold = !!cell.isBold();
const italic = !!cell.isItalic();
const underline = !!cell.isUnderline();
```

**See also:** [rgb-color-rendering-TerminalRenderer-20260126.md](../ui-bugs/rgb-color-rendering-TerminalRenderer-20260126.md)
