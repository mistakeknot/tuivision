import xtermHeadless from "@xterm/headless";
const { Terminal } = xtermHeadless;
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
    terminal;
    _cols;
    _rows;
    constructor(cols = 80, rows = 24) {
        this._cols = cols;
        this._rows = rows;
        this.terminal = new Terminal({
            cols,
            rows,
            allowProposedApi: true,
        });
    }
    get cols() {
        return this._cols;
    }
    get rows() {
        return this._rows;
    }
    write(data) {
        this.terminal.write(data);
    }
    resize(cols, rows) {
        this._cols = cols;
        this._rows = rows;
        this.terminal.resize(cols, rows);
    }
    /**
     * Convert a color number to hex string
     */
    colorToHex(color, isDefault, defaultColor) {
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
            const toHex = (v) => (v === 0 ? 0 : 55 + v * 40);
            return `#${toHex(r).toString(16).padStart(2, "0")}${toHex(g).toString(16).padStart(2, "0")}${toHex(b).toString(16).padStart(2, "0")}`;
        }
        // Grayscale (232-255)
        const gray = (color - 232) * 10 + 8;
        return `#${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}`;
    }
    /**
     * Get the current screen state as structured data
     */
    getScreenState() {
        const buffer = this.terminal.buffer.active;
        const lines = [];
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
            const cells = [];
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
                // Get foreground color
                const fgColor = cell.getFgColor();
                const isFgDefault = cell.isFgDefault();
                const fg = this.colorToHex(fgColor, isFgDefault, "#ffffff");
                // Get background color
                const bgColor = cell.getBgColor();
                const isBgDefault = cell.isBgDefault();
                const bg = this.colorToHex(bgColor, isBgDefault, "#000000");
                // Get attributes using xterm.js API (methods return 0 or 1)
                const bold = cell.isBold() === 1;
                const italic = cell.isItalic() === 1;
                const underline = cell.isUnderline() === 1;
                const dim = cell.isDim() === 1;
                const inverse = cell.isInverse() === 1;
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
    getScreenText() {
        const state = this.getScreenState();
        return state.lines.map((l) => l.text).join("\n");
    }
    dispose() {
        this.terminal.dispose();
    }
}
//# sourceMappingURL=terminal-renderer.js.map