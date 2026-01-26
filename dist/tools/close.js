import { z } from "zod";
export const closeSessionSchema = z.object({
    session_id: z.string().describe("Session ID from spawn_tui"),
});
export function closeSession(sessionManager, input) {
    const closed = sessionManager.closeSession(input.session_id);
    if (!closed) {
        return {
            success: false,
            message: `Session not found: ${input.session_id}`,
        };
    }
    return {
        success: true,
        message: `Session ${input.session_id} closed successfully`,
    };
}
//# sourceMappingURL=close.js.map