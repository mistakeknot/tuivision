import type { ScreenState } from "./terminal-renderer.js";
export interface ScreenshotOptions {
    fontSize?: number;
    fontFamily?: string;
    padding?: number;
    cursorColor?: string;
    showCursor?: boolean;
}
/**
 * Render a terminal screen state to a PNG image buffer
 */
export declare function renderToPng(state: ScreenState, options?: ScreenshotOptions): Buffer;
/**
 * Render a terminal screen state to an SVG string
 */
export declare function renderToSvg(state: ScreenState, options?: ScreenshotOptions): string;
//# sourceMappingURL=screenshot.d.ts.map