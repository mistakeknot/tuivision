/**
 * Dynamic canvas loader with fallback chain.
 *
 * Tries to load canvas implementations in order:
 * 1. @napi-rs/canvas (prebuilt binaries, no compilation needed)
 * 2. canvas (node-canvas, requires node-gyp + system libs)
 * 3. null (SVG-only mode — no PNG screenshots)
 */
let cached = null;
export async function loadCanvas() {
    if (cached)
        return cached;
    // Try @napi-rs/canvas first (prebuilt, no compilation)
    try {
        // @ts-ignore — optional dependency, may not be installed
        const mod = await import("@napi-rs/canvas");
        cached = {
            api: {
                createCanvas: mod.createCanvas,
                registerFont: mod.GlobalFonts
                    ? (path, options) => {
                        mod.GlobalFonts.registerFromPath(path, options.family);
                    }
                    : () => { },
            },
            backend: "napi-rs",
        };
        return cached;
    }
    catch {
        // Not installed — try next
    }
    // Try node-canvas (requires node-gyp compilation)
    try {
        const mod = await import("canvas");
        cached = {
            api: {
                createCanvas: mod.createCanvas,
                registerFont: mod.registerFont,
            },
            backend: "node-canvas",
        };
        return cached;
    }
    catch {
        // Not installed — fall back to SVG-only
    }
    cached = { api: null, backend: "none" };
    return cached;
}
export function getCanvasBackend() {
    return cached?.backend ?? "not-loaded";
}
export function isPngAvailable() {
    return cached?.api !== null;
}
//# sourceMappingURL=canvas-loader.js.map