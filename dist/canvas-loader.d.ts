/**
 * Dynamic canvas loader with fallback chain.
 *
 * Tries to load canvas implementations in order:
 * 1. @napi-rs/canvas (prebuilt binaries, no compilation needed)
 * 2. canvas (node-canvas, requires node-gyp + system libs)
 * 3. null (SVG-only mode — no PNG screenshots)
 */
export interface CanvasApi {
    createCanvas(width: number, height: number): any;
    registerFont(path: string, options: {
        family: string;
    }): void;
}
export interface CanvasLoadResult {
    api: CanvasApi | null;
    backend: "napi-rs" | "node-canvas" | "none";
}
export declare function loadCanvas(): Promise<CanvasLoadResult>;
export declare function getCanvasBackend(): string;
export declare function isPngAvailable(): boolean;
//# sourceMappingURL=canvas-loader.d.ts.map