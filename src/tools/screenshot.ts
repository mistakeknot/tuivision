import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
import { renderToPng, renderToSvg } from "../screenshot.js";

export const getScreenshotSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
  format: z
    .enum(["png", "svg"])
    .optional()
    .default("png")
    .describe("Image format: 'png' for bitmap, 'svg' for vector"),
  font_size: z
    .number()
    .optional()
    .default(14)
    .describe("Font size in pixels"),
  show_cursor: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to show the cursor"),
});

export type GetScreenshotInput = z.infer<typeof getScreenshotSchema>;

export interface ScreenshotResult {
  format: "png" | "svg";
  mime_type: string;
  data: string; // base64 for PNG, raw SVG for SVG
  width: number;
  height: number;
}

export function getScreenshot(
  sessionManager: SessionManager,
  input: GetScreenshotInput
): ScreenshotResult {
  const session = sessionManager.getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  const state = session.renderer.getScreenState();
  const options = {
    fontSize: input.font_size,
    showCursor: input.show_cursor,
  };

  if (input.format === "svg") {
    const svg = renderToSvg(state, options);
    return {
      format: "svg",
      mime_type: "image/svg+xml",
      data: svg,
      width: state.width,
      height: state.height,
    };
  }

  const png = renderToPng(state, options);
  return {
    format: "png",
    mime_type: "image/png",
    data: png.toString("base64"),
    width: state.width,
    height: state.height,
  };
}
