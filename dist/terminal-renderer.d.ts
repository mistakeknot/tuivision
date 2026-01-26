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
     * Convert a color number to hex string
     */
    private colorToHex;
    /**
     * Get the current screen state as structured data
     */
    getScreenState(): ScreenState;
    /**
     * Get a simplified text representation of the screen
     */
    getScreenText(): string;
    dispose(): void;
}
//# sourceMappingURL=terminal-renderer.d.ts.map