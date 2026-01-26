import { z } from "zod";
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
export function getScreenshot(sessionManager, input) {
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
//# sourceMappingURL=screenshot.js.map