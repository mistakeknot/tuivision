import type { ScreenState } from "./terminal-renderer.js";
import { loadCanvas, isPngAvailable, getCanvasBackend } from "./canvas-loader.js";
import type { CanvasApi } from "./canvas-loader.js";
import * as fs from "fs";

export interface ScreenshotOptions {
  fontSize?: number;
  fontFamily?: string;
  padding?: number;
  cursorColor?: string;
  showCursor?: boolean;
}

const DEFAULT_OPTIONS: Required<ScreenshotOptions> = {
  fontSize: 14,
  fontFamily: "monospace",
  padding: 8,
  cursorColor: "#ffffff",
  showCursor: true,
};

let fontRegistered = false;
let registeredFontFamily = "monospace";

/**
 * Try to register a monospace font if available
 */
function tryRegisterFont(api: CanvasApi): string {
  if (fontRegistered) return registeredFontFamily;

  const fontPaths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    "/usr/share/fonts/google-noto/NotoSansMono-Regular.ttf",
    "/usr/share/fonts/noto/NotoSansMono-Regular.ttf",
  ];

  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        api.registerFont(fontPath, { family: "TerminalFont" });
        fontRegistered = true;
        registeredFontFamily = "TerminalFont";
        return "TerminalFont";
      } catch {
        // Continue to next font
      }
    }
  }

  fontRegistered = true;
  return "monospace";
}

export function resolveFontFamily(options: ScreenshotOptions): string {
  return options.fontFamily ?? registeredFontFamily;
}

/** Re-export for callers to check before requesting PNG */
export { isPngAvailable, getCanvasBackend };

/** Initialize the canvas backend. Call once at startup. */
export async function initScreenshot(): Promise<void> {
  const { api } = await loadCanvas();
  if (api) {
    tryRegisterFont(api);
  }
}

/**
 * Render a terminal screen state to a PNG image buffer.
 * Throws if no canvas backend is available.
 */
export async function renderToPng(
  state: ScreenState,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const { api, backend } = await loadCanvas();
  if (!api) {
    throw new Error(
      "PNG screenshots unavailable: no canvas backend installed. " +
      "Install @napi-rs/canvas (recommended, prebuilt) or canvas (requires build tools). " +
      "SVG screenshots are always available as an alternative."
    );
  }

  tryRegisterFont(api);

  const opts = { ...DEFAULT_OPTIONS, ...options };
  opts.fontFamily = resolveFontFamily(options);

  // Calculate character dimensions
  const testCanvas = api.createCanvas(100, 100);
  const testCtx = testCanvas.getContext("2d");
  testCtx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  const charWidth = testCtx.measureText("M").width;
  const charHeight = opts.fontSize * 1.2;

  const width = Math.ceil(charWidth * state.width + opts.padding * 2);
  const height = Math.ceil(charHeight * state.height + opts.padding * 2);

  const canvas = api.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Set font
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = "top";

  // Draw each cell
  for (let y = 0; y < state.height; y++) {
    const line = state.lines[y];
    if (!line) continue;

    const yPos = opts.padding + y * charHeight;

    for (let x = 0; x < state.width; x++) {
      const cell = line.cells[x];
      if (!cell) continue;

      const xPos = opts.padding + x * charWidth;

      // Draw background if not default black
      if (cell.bg !== "#000000") {
        ctx.fillStyle = cell.bg;
        ctx.fillRect(xPos, yPos, charWidth, charHeight);
      }

      // Draw cursor
      if (
        opts.showCursor &&
        state.cursor.visible &&
        x === state.cursor.x &&
        y === state.cursor.y
      ) {
        ctx.fillStyle = opts.cursorColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(xPos, yPos, charWidth, charHeight);
        ctx.globalAlpha = 1.0;
      }

      // Skip empty characters
      if (cell.char === " " || cell.char === "") continue;

      // Set text style
      let fontStyle = "";
      if (cell.bold) fontStyle += "bold ";
      if (cell.italic) fontStyle += "italic ";
      ctx.font = `${fontStyle}${opts.fontSize}px ${opts.fontFamily}`;

      // Apply dim effect
      if (cell.dim) {
        ctx.globalAlpha = 0.5;
      }

      // Draw character
      ctx.fillStyle = cell.fg;
      ctx.fillText(cell.char, xPos, yPos);

      // Reset
      if (cell.dim) {
        ctx.globalAlpha = 1.0;
      }

      // Draw underline
      if (cell.underline) {
        ctx.strokeStyle = cell.fg;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPos, yPos + charHeight - 2);
        ctx.lineTo(xPos + charWidth, yPos + charHeight - 2);
        ctx.stroke();
      }
    }
  }

  return canvas.toBuffer("image/png");
}

/**
 * Render a terminal screen state to an SVG string.
 * Always available — no native dependencies.
 */
export function renderToSvg(
  state: ScreenState,
  options: ScreenshotOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Character dimensions for SVG
  const charWidth = opts.fontSize * 0.6;
  const charHeight = opts.fontSize * 1.2;

  const width = charWidth * state.width + opts.padding * 2;
  const height = charHeight * state.height + opts.padding * 2;

  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );

  lines.push("<defs>");
  lines.push('<style type="text/css">');
  lines.push(
    `  .terminal-text { font-family: "DejaVu Sans Mono", "Consolas", monospace; font-size: ${opts.fontSize}px; }`
  );
  lines.push("</style>");
  lines.push("</defs>");

  lines.push(`<rect width="${width}" height="${height}" fill="#000000"/>`);

  for (let y = 0; y < state.height; y++) {
    const line = state.lines[y];
    if (!line) continue;

    const yPos = opts.padding + y * charHeight;

    for (let x = 0; x < state.width; x++) {
      const cell = line.cells[x];
      if (!cell) continue;

      const xPos = opts.padding + x * charWidth;

      if (cell.bg !== "#000000") {
        lines.push(
          `<rect x="${xPos}" y="${yPos}" width="${charWidth}" height="${charHeight}" fill="${cell.bg}"/>`
        );
      }

      if (
        opts.showCursor &&
        state.cursor.visible &&
        x === state.cursor.x &&
        y === state.cursor.y
      ) {
        lines.push(
          `<rect x="${xPos}" y="${yPos}" width="${charWidth}" height="${charHeight}" fill="${opts.cursorColor}" opacity="0.5"/>`
        );
      }

      if (cell.char === " " || cell.char === "") continue;

      const char = cell.char
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      const styles: string[] = [];
      if (cell.bold) styles.push("font-weight:bold");
      if (cell.italic) styles.push("font-style:italic");
      if (cell.dim) styles.push("opacity:0.5");

      const styleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";

      const textY = yPos + opts.fontSize;

      lines.push(
        `<text class="terminal-text" x="${xPos}" y="${textY}" fill="${cell.fg}"${styleAttr}>${char}</text>`
      );

      if (cell.underline) {
        const underlineY = yPos + charHeight - 2;
        lines.push(
          `<line x1="${xPos}" y1="${underlineY}" x2="${xPos + charWidth}" y2="${underlineY}" stroke="${cell.fg}" stroke-width="1"/>`
        );
      }
    }
  }

  lines.push("</svg>");
  return lines.join("\n");
}
