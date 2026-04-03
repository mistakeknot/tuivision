import xtermHeadless from "@xterm/headless";
const { Terminal } = xtermHeadless;

type TerminalType = InstanceType<typeof Terminal>;
type IBufferLine = NonNullable<
  ReturnType<TerminalType["buffer"]["active"]["getLine"]>
>;
type IBufferCell = ReturnType<IBufferLine["getCell"]>;

export interface CellData {
  char: string;
  fg: string;
  bg: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  dim: boolean;
  inverse: boolean;
}

export interface LineData {
  text: string;
  cells: CellData[];
}

export interface ScreenState {
  width: number;
  height: number;
  cursor: {
    x: number;
    y: number;
    visible: boolean;
  };
  lines: LineData[];
}

// Single-char color codes for annotated format (palette index → code)
const COLOR_CODES: Record<number, string> = {
  0: "k",
  1: "r",
  2: "g",
  3: "y",
  4: "b",
  5: "m",
  6: "c",
  7: "w",
  8: "K",
  9: "R",
  10: "G",
  11: "Y",
  12: "B",
  13: "M",
  14: "C",
  15: "W",
};

// Semantic color groups for agent consumption
export const SEMANTIC_COLOR_GROUPS: Record<string, string> = {
  r: "error",
  R: "error",
  g: "success",
  G: "success",
  y: "warning",
  Y: "warning",
  b: "info",
  B: "info",
  c: "info",
  C: "info",
  m: "accent",
  M: "accent",
  w: "neutral",
  W: "neutral",
  k: "neutral",
  K: "neutral",
};

// Default xterm colors (16-color palette)
const DEFAULT_COLORS = [
  "#000000", // 0 - Black
  "#cd0000", // 1 - Red
  "#00cd00", // 2 - Green
  "#cdcd00", // 3 - Yellow
  "#0000ee", // 4 - Blue
  "#cd00cd", // 5 - Magenta
  "#00cdcd", // 6 - Cyan
  "#e5e5e5", // 7 - White
  "#7f7f7f", // 8 - Bright Black
  "#ff0000", // 9 - Bright Red
  "#00ff00", // 10 - Bright Green
  "#ffff00", // 11 - Bright Yellow
  "#5c5cff", // 12 - Bright Blue
  "#ff00ff", // 13 - Bright Magenta
  "#00ffff", // 14 - Bright Cyan
  "#ffffff", // 15 - Bright White
];

export class TerminalRenderer {
  private terminal: TerminalType;
  private _cols: number;
  private _rows: number;

  constructor(cols: number = 80, rows: number = 24) {
    this._cols = cols;
    this._rows = rows;

    this.terminal = new Terminal({
      cols,
      rows,
      allowProposedApi: true,
    });
  }

  get cols(): number {
    return this._cols;
  }

  get rows(): number {
    return this._rows;
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    this.terminal.resize(cols, rows);
  }

  /**
   * Get hex color from a cell using public IBufferCell API.
   * Uses boolean detection methods (isFgDefault/isFgPalette/isFgRGB)
   * instead of raw bitmask values from getFgColorMode().
   */
  private getCellColor(
    cell: NonNullable<IBufferCell>,
    isBackground: boolean,
    defaultColor: string,
  ): string {
    const isDefault = isBackground ? cell.isBgDefault() : cell.isFgDefault();
    if (isDefault) return defaultColor;

    const isPalette = isBackground ? cell.isBgPalette() : cell.isFgPalette();
    const isRGB = isBackground ? cell.isBgRGB() : cell.isFgRGB();
    const colorValue = isBackground ? cell.getBgColor() : cell.getFgColor();

    if (isRGB) {
      const r = (colorValue >> 16) & 0xff;
      const g = (colorValue >> 8) & 0xff;
      const b = colorValue & 0xff;
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }

    if (isPalette) {
      const colorIndex = colorValue & 0xff;
      if (colorIndex < 16) {
        return DEFAULT_COLORS[colorIndex];
      }
      if (colorIndex < 232) {
        const idx = colorIndex - 16;
        const r = Math.floor(idx / 36);
        const g = Math.floor((idx % 36) / 6);
        const b = idx % 6;
        const toHex = (v: number) => (v === 0 ? 0 : 55 + v * 40);
        return `#${toHex(r).toString(16).padStart(2, "0")}${toHex(g).toString(16).padStart(2, "0")}${toHex(b).toString(16).padStart(2, "0")}`;
      }
      const gray = (colorIndex - 232) * 10 + 8;
      return `#${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}`;
    }

    return defaultColor;
  }

  /**
   * Convert RGB to CIELAB color space for perceptual distance calculations.
   */
  private static rgbToLab(
    r: number,
    g: number,
    b: number,
  ): [number, number, number] {
    // sRGB → linear
    let rl = r / 255,
      gl = g / 255,
      bl = b / 255;
    rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92;
    gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92;
    bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92;
    // linear RGB → XYZ (D65)
    let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
    let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
    let z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
    // XYZ → CIELAB
    const f = (t: number) =>
      t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const L = 116 * f(y) - 16;
    const a = 500 * (f(x) - f(y));
    const bL = 200 * (f(y) - f(z));
    return [L, a, bL];
  }

  // Precomputed CIELAB centroids for the 16 default colors
  private static readonly LAB_CENTROIDS: [number, number, number][] =
    DEFAULT_COLORS.map((hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return TerminalRenderer.rgbToLab(r, g, b);
    });

  /**
   * Convert 256-color palette index (16-255) to RGB.
   */
  private static palette256ToRgb(index: number): [number, number, number] {
    if (index < 232) {
      const idx = index - 16;
      const r = Math.floor(idx / 36);
      const g = Math.floor((idx % 36) / 6);
      const b = idx % 6;
      const toVal = (v: number) => (v === 0 ? 0 : 55 + v * 40);
      return [toVal(r), toVal(g), toVal(b)];
    }
    const gray = (index - 232) * 10 + 8;
    return [gray, gray, gray];
  }

  /**
   * Find nearest 16-color code for an RGB value using CIELAB distance.
   */
  private static nearestColorCode(r: number, g: number, b: number): string {
    const lab = TerminalRenderer.rgbToLab(r, g, b);
    let bestIdx = 7; // default to white
    let bestDist = Infinity;
    for (let i = 0; i < 16; i++) {
      const c = TerminalRenderer.LAB_CENTROIDS[i];
      const dL = lab[0] - c[0],
        da = lab[1] - c[1],
        db = lab[2] - c[2];
      const dist = dL * dL + da * da + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return COLOR_CODES[bestIdx];
  }

  /**
   * Quantize a cell's foreground color to a single-char color code.
   * Uses palette index directly for indexed colors (semantic, not visual).
   * Uses CIELAB perceptual distance for truecolor.
   * Returns empty string for default color.
   */
  quantizeFgColor(cell: NonNullable<IBufferCell>): string {
    if (cell.isFgDefault()) return "";
    const colorValue = cell.getFgColor();
    if (cell.isFgPalette()) {
      const idx = colorValue & 0xff;
      if (idx < 16) return COLOR_CODES[idx] || "w";
      const [r, g, b] = TerminalRenderer.palette256ToRgb(idx);
      return TerminalRenderer.nearestColorCode(r, g, b);
    }
    if (cell.isFgRGB()) {
      const r = (colorValue >> 16) & 0xff;
      const g = (colorValue >> 8) & 0xff;
      const b = colorValue & 0xff;
      return TerminalRenderer.nearestColorCode(r, g, b);
    }
    return "";
  }

  /**
   * Quantize a cell's background color to a single-char color code.
   */
  quantizeBgColor(cell: NonNullable<IBufferCell>): string {
    if (cell.isBgDefault()) return "";
    const colorValue = cell.getBgColor();
    if (cell.isBgPalette()) {
      const idx = colorValue & 0xff;
      if (idx < 16) return COLOR_CODES[idx] || "k";
      const [r, g, b] = TerminalRenderer.palette256ToRgb(idx);
      return TerminalRenderer.nearestColorCode(r, g, b);
    }
    if (cell.isBgRGB()) {
      const r = (colorValue >> 16) & 0xff;
      const g = (colorValue >> 8) & 0xff;
      const b = colorValue & 0xff;
      return TerminalRenderer.nearestColorCode(r, g, b);
    }
    return "";
  }

  /**
   * Get the current screen state as structured data
   */
  getScreenState(): ScreenState {
    const buffer = this.terminal.buffer.active;
    const lines: LineData[] = [];

    for (let y = 0; y < this._rows; y++) {
      const line = buffer.getLine(y);
      if (!line) {
        // Empty line
        lines.push({
          text: "",
          cells: [],
        });
        continue;
      }

      const cells: CellData[] = [];
      let text = "";

      for (let x = 0; x < this._cols; x++) {
        const cell = line.getCell(x);
        if (!cell) {
          cells.push({
            char: " ",
            fg: "#ffffff",
            bg: "#000000",
            bold: false,
            italic: false,
            underline: false,
            dim: false,
            inverse: false,
          });
          text += " ";
          continue;
        }

        if (cell.getWidth() === 0) {
          // Wide character continuation cell — push empty placeholder
          // to keep cells[] aligned with column positions for SVG rendering
          cells.push({
            char: "",
            fg: "#000000",
            bg: "#000000",
            bold: false,
            italic: false,
            underline: false,
            dim: false,
            inverse: false,
          });
          continue;
        }

        const char = cell.getChars() || " ";
        text += char;

        // Get colors using public IBufferCell API
        const fg = this.getCellColor(cell, false, "#ffffff");
        const bg = this.getCellColor(cell, true, "#000000");

        // Get attributes using xterm.js API (methods return non-zero for truthy)
        const bold = !!cell.isBold();
        const italic = !!cell.isItalic();
        const underline = !!cell.isUnderline();
        const dim = !!cell.isDim();
        const inverse = !!cell.isInverse();

        cells.push({
          char,
          fg: inverse ? bg : fg,
          bg: inverse ? fg : bg,
          bold,
          italic,
          underline,
          dim,
          inverse,
        });
      }

      lines.push({
        text: text.trimEnd(),
        cells,
      });
    }

    return {
      width: this._cols,
      height: this._rows,
      cursor: {
        x: buffer.cursorX,
        y: buffer.cursorY,
        visible: this.terminal.buffer.active === this.terminal.buffer.normal,
      },
      lines,
    };
  }

  /**
   * Get a simplified text representation of the screen
   */
  getScreenText(): string {
    const state = this.getScreenState();
    return state.lines.map((l) => l.text).join("\n");
  }

  /**
   * Get annotated text with inline color/style markers.
   * Produces ~400-800 tokens per 80x24 screen (vs 12K for full, 250 for text).
   * Format spec: interverse/tuivision/docs/annotated-format-spec.md
   */
  getAnnotatedText(options?: { includeRoles?: boolean }): string {
    const buffer = this.terminal.buffer.active;
    const outputLines: string[] = [];

    // Structural preamble
    const cursorVisible =
      this.terminal.buffer.active === this.terminal.buffer.normal;
    const cursorPart = cursorVisible
      ? `cursor=${buffer.cursorX},${buffer.cursorY}`
      : "cursor=hidden";
    outputLines.push(
      `[screen ${this._cols}x${this._rows} ${cursorPart}]`,
    );

    // First pass: compute modal foreground color for density threshold
    const fgCounts = new Map<string, number>();
    let totalStyledCells = 0;
    for (let y = 0; y < this._rows; y++) {
      const line = buffer.getLine(y);
      if (!line) continue;
      for (let x = 0; x < this._cols; x++) {
        const cell = line.getCell(x);
        if (!cell || cell.getWidth() === 0) continue;
        const ch = cell.getChars() || " ";
        if (ch === " ") continue;
        const code = this.quantizeFgColor(cell);
        if (code) {
          fgCounts.set(code, (fgCounts.get(code) || 0) + 1);
          totalStyledCells++;
        }
      }
    }

    // Find modal color and check density threshold (>60% = suppress)
    let modalColor = "";
    if (totalStyledCells > 0) {
      let maxCount = 0;
      for (const [code, count] of fgCounts) {
        if (count > maxCount) {
          maxCount = count;
          modalColor = code;
        }
      }
      if (maxCount / totalStyledCells <= 0.6) {
        modalColor = ""; // Below threshold — don't suppress anything
      }
    }

    // Second pass: generate annotated output
    for (let y = 0; y < this._rows; y++) {
      const line = buffer.getLine(y);
      if (!line) {
        outputLines.push("");
        continue;
      }

      let lineOut = "";
      let currentMarker = ""; // Currently open marker string (e.g., "r+")
      let markerOpen = false;

      for (let x = 0; x < this._cols; x++) {
        const cell = line.getCell(x);
        if (!cell || cell.getWidth() === 0) continue;

        const ch = cell.getChars() || " ";

        // Build marker string for this cell
        let cellMarker = "";

        // Color (use original colors, not pre-resolved inverse)
        const fgCode = this.quantizeFgColor(cell);
        if (fgCode && fgCode !== modalColor) {
          cellMarker += fgCode;
        }

        // Style attributes
        if (cell.isBold()) cellMarker += "+";
        if (cell.isUnderline()) cellMarker += "_";
        if (cell.isDim()) cellMarker += "~";
        if (cell.isInverse()) cellMarker += "^";

        // Check if marker changed
        if (cellMarker !== currentMarker) {
          // Close previous marker if open
          if (markerOpen) {
            lineOut += "[/]";
            markerOpen = false;
          }
          // Open new marker if non-empty
          if (cellMarker) {
            lineOut += `[${cellMarker}]`;
            markerOpen = true;
          }
          currentMarker = cellMarker;
        }

        // Escape literal `[` in terminal content
        if (ch === "[") {
          lineOut += "[[";
        } else {
          lineOut += ch;
        }
      }

      // Close any open marker at end of line
      if (markerOpen) {
        lineOut += "[/]";
      }

      outputLines.push(lineOut.trimEnd());
    }

    return outputLines.join("\n");
  }

  dispose(): void {
    this.terminal.dispose();
  }
}
