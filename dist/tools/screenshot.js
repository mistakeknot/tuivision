import { z } from "zod";
import { renderToPng, renderToSvg, renderToSvgMerged, isPngAvailable, } from "../screenshot.js";
export const getScreenshotSchema = z.object({
    session_id: z.string().describe("Session ID from spawn_tui"),
    format: z
        .enum(["png", "svg"])
        .optional()
        .default("png")
        .describe("Image format: 'png' for bitmap, 'svg' for vector"),
    font_size: z.number().optional().default(14).describe("Font size in pixels"),
    show_cursor: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to show the cursor"),
    svg_mode: z
        .enum(["per_cell", "merged"])
        .optional()
        .default("per_cell")
        .describe("SVG rendering mode: 'per_cell' (current, one element per character) or 'merged' (optimized, groups same-styled adjacent cells into spans)"),
});
export async function getScreenshot(sessionManager, input) {
    const session = sessionManager.getSession(input.session_id);
    if (!session) {
        throw new Error(`Session not found: ${input.session_id}`);
    }
    const state = session.renderer.getScreenState();
    const options = {
        fontSize: input.font_size,
        showCursor: input.show_cursor,
    };
    // Auto-degrade PNG to SVG if canvas is unavailable
    let format = input.format;
    let note;
    if (format === "png" && !isPngAvailable()) {
        format = "svg";
        note =
            "PNG unavailable (no canvas backend). Returning SVG instead. Install @napi-rs/canvas for PNG support.";
    }
    if (format === "svg") {
        const svg = input.svg_mode === "merged"
            ? renderToSvgMerged(state, options)
            : renderToSvg(state, options);
        return {
            format: "svg",
            mime_type: "image/svg+xml",
            data: svg,
            width: state.width,
            height: state.height,
            ...(note ? { note } : {}),
        };
    }
    const png = await renderToPng(state, options);
    return {
        format: "png",
        mime_type: "image/png",
        data: png.toString("base64"),
        width: state.width,
        height: state.height,
    };
}
//# sourceMappingURL=screenshot.js.map