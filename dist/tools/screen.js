import { z } from "zod";
export const getScreenSchema = z.object({
    session_id: z.string().describe("Session ID from spawn_tui"),
    format: z
        .enum(["full", "text", "compact"])
        .optional()
        .default("full")
        .describe("Output format: 'full' includes all cell data, 'text' returns just the text, 'compact' returns text with basic cursor info"),
});
export function getScreen(sessionManager, input) {
    const session = sessionManager.getSession(input.session_id);
    if (!session) {
        throw new Error(`Session not found: ${input.session_id}`);
    }
    switch (input.format) {
        case "text":
            return session.renderer.getScreenText();
        case "compact":
            {
                const state = session.renderer.getScreenState();
                return {
                    width: state.width,
                    height: state.height,
                    cursor: state.cursor,
                    text: session.renderer.getScreenText(),
                };
            }
        case "full":
        default:
            return session.renderer.getScreenState();
    }
}
//# sourceMappingURL=screen.js.map