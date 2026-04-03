import xtermHeadless from "@xterm/headless";
declare const Terminal: typeof xtermHeadless.Terminal;
type TerminalType = InstanceType<typeof Terminal>;
type IBufferLine = NonNullable<ReturnType<TerminalType["buffer"]["active"]["getLine"]>>;
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
export declare const SEMANTIC_COLOR_GROUPS: Record<string, string>;
export declare class TerminalRenderer {
    private terminal;
    private _cols;
    private _rows;
    constructor(cols?: number, rows?: number);
    get cols(): number;
    get rows(): number;
    write(data: string): void;
    resize(cols: number, rows: number): void;
    /**
     * Get hex color from a cell using public IBufferCell API.
     * Uses boolean detection methods (isFgDefault/isFgPalette/isFgRGB)
     * instead of raw bitmask values from getFgColorMode().
     */
    private getCellColor;
    /**
     * Convert RGB to CIELAB color space for perceptual distance calculations.
     */
    private static rgbToLab;
    private static readonly LAB_CENTROIDS;
    /**
     * Convert 256-color palette index (16-255) to RGB.
     */
    private static palette256ToRgb;
    /**
     * Find nearest 16-color code for an RGB value using CIELAB distance.
     */
    private static nearestColorCode;
    /**
     * Quantize a cell's foreground color to a single-char color code.
     * Uses palette index directly for indexed colors (semantic, not visual).
     * Uses CIELAB perceptual distance for truecolor.
     * Returns empty string for default color.
     */
    quantizeFgColor(cell: NonNullable<IBufferCell>): string;
    /**
     * Quantize a cell's background color to a single-char color code.
     */
    quantizeBgColor(cell: NonNullable<IBufferCell>): string;
    /**
     * Get the current screen state as structured data
     */
    getScreenState(): ScreenState;
    /**
     * Get a simplified text representation of the screen
     */
    getScreenText(): string;
    /**
     * Get annotated text with inline color/style markers.
     * Produces ~400-800 tokens per 80x24 screen (vs 12K for full, 250 for text).
     * Format spec: interverse/tuivision/docs/annotated-format-spec.md
     */
    getAnnotatedText(options?: {
        includeRoles?: boolean;
    }): string;
    dispose(): void;
}
export {};
//# sourceMappingURL=terminal-renderer.d.ts.map