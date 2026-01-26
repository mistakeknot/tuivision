import { z } from "zod";
import type { SessionManager } from "../session-manager.js";

export const closeSessionSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
});

export type CloseSessionInput = z.infer<typeof closeSessionSchema>;

export function closeSession(
  sessionManager: SessionManager,
  input: CloseSessionInput
): { success: boolean; message: string } {
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
