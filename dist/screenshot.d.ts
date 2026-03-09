import type { ScreenState } from "./terminal-renderer.js";
import { isPngAvailable, getCanvasBackend } from "./canvas-loader.js";
export interface ScreenshotOptions {
    fontSize?: number;
    fontFamily?: string;
    padding?: number;
    cursorColor?: string;
    showCursor?: boolean;
}
export declare function resolveFontFamily(options: ScreenshotOptions): string;
/** Re-export for callers to check before requesting PNG */
export { isPngAvailable, getCanvasBackend };
/** Initialize the canvas backend. Call once at startup. */
export declare function initScreenshot(): Promise<void>;
/**
 * Render a terminal screen state to a PNG image buffer.
 * Throws if no canvas backend is available.
 */
export declare function renderToPng(state: ScreenState, options?: ScreenshotOptions): Promise<Buffer>;
/**
 * Render a terminal screen state to an SVG string.
 * Always available — no native dependencies.
 */
export declare function renderToSvg(state: ScreenState, options?: ScreenshotOptions): string;
//# sourceMappingURL=screenshot.d.ts.map