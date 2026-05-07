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
  registerFont(path: string, options: { family: string }): void;
}

export interface CanvasLoadResult {
  api: CanvasApi | null;
  backend: "napi-rs" | "node-canvas" | "none";
}

let cached: CanvasLoadResult | null = null;

export async function loadCanvas(): Promise<CanvasLoadResult> {
  if (cached) return cached;

  // Try @napi-rs/canvas first (prebuilt, no compilation)
  try {
    // @ts-ignore — optional dependency, may not be installed
    const mod = await import("@napi-rs/canvas");
    cached = {
      api: {
        createCanvas: mod.createCanvas,
        registerFont: mod.GlobalFonts
          ? (path: string, options: { family: string }) => {
              mod.GlobalFonts.registerFromPath(path, options.family);
            }
          : () => {},
      },
      backend: "napi-rs",
    };
    return cached;
  } catch {
    // Not installed — try next
  }

  // Try node-canvas (requires node-gyp compilation)
  try {
    // @ts-ignore — optional dependency, may not be installed
    const mod = await import("canvas");
    cached = {
      api: {
        createCanvas: mod.createCanvas,
        registerFont: mod.registerFont,
      },
      backend: "node-canvas",
    };
    return cached;
  } catch {
    // Not installed — fall back to SVG-only
  }

  cached = { api: null, backend: "none" };
  return cached;
}

export function getCanvasBackend(): string {
  return cached?.backend ?? "not-loaded";
}

export function isPngAvailable(): boolean {
  return cached?.api !== null;
}
