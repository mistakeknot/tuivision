import { z } from "zod";
import type { SessionManager } from "../session-manager.js";

export const resizeSessionSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
  cols: z.number().min(1).max(500).describe("New terminal width in columns"),
  rows: z.number().min(1).max(200).describe("New terminal height in rows"),
});

export type ResizeSessionInput = z.infer<typeof resizeSessionSchema>;

export function resizeSession(
  sessionManager: SessionManager,
  input: ResizeSessionInput
): { success: boolean; cols: number; rows: number } {
  const session = sessionManager.getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  sessionManager.resize(input.session_id, input.cols, input.rows);

  return {
    success: true,
    cols: input.cols,
    rows: input.rows,
  };
}
