import xtermHeadless from "@xterm/headless";
const { Terminal } = xtermHeadless;

type TerminalType = InstanceType<typeof Terminal>;

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

    // Mode 1: 16-color palette, Mode 2: 256-color palette
    // The color index is in the lower byte(s)
    const colorIndex = rawValue & 0xff;

    // Handle 16-color palette (0-15)
    if (colorIndex < 16) {
      return DEFAULT_COLORS[colorIndex];
    }

    // Handle 256-color palette (16-231: 6x6x6 cube, 232-255: grayscale)
    if (colorIndex < 232) {
      // 6x6x6 color cube
      const idx = colorIndex - 16;
      const r = Math.floor(idx / 36);
      const g = Math.floor((idx % 36) / 6);
      const b = idx % 6;
      const toHex = (v: number) => (v === 0 ? 0 : 55 + v * 40);
      return `#${toHex(r).toString(16).padStart(2, "0")}${toHex(g).toString(16).padStart(2, "0")}${toHex(b).toString(16).padStart(2, "0")}`;
    }

    // Grayscale (232-255)
    const gray = (colorIndex - 232) * 10 + 8;
    return `#${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}`;
  }

  /**
   * Convert a color number to hex string (legacy method for compatibility)
   */
  private colorToHex(color: number, isDefault: boolean, defaultColor: string): string {
    if (isDefault) {
      return defaultColor;
    }

    // Handle 16-color palette (0-15)
    if (color < 16) {
      return DEFAULT_COLORS[color];
    }

    // Handle 256-color palette (16-231: 6x6x6 cube, 232-255: grayscale)
    if (color < 232) {
      // 6x6x6 color cube
      const idx = color - 16;
      const r = Math.floor(idx / 36);
      const g = Math.floor((idx % 36) / 6);
      const b = idx % 6;
      const toHex = (v: number) => (v === 0 ? 0 : 55 + v * 40);
      return `#${toHex(r).toString(16).padStart(2, "0")}${toHex(g).toString(16).padStart(2, "0")}${toHex(b).toString(16).padStart(2, "0")}`;
    }

    // Grayscale (232-255)
    const gray = (color - 232) * 10 + 8;
    return `#${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}`;
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

        const char = cell.getChars() || " ";
        text += char;

        // Get colors from raw fg/bg values (handles RGB true color)
        // The cell object has fg and bg as direct properties containing encoded color values
        const cellAny = cell as unknown as { fg: number; bg: number };
        const fg = this.extractColor(cellAny.fg, "#ffffff");
        const bg = this.extractColor(cellAny.bg, "#000000");

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

  dispose(): void {
    this.terminal.dispose();
  }
}
