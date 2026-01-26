import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
import type { ScreenState } from "../terminal-renderer.js";

export const getScreenSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
  format: z
    .enum(["full", "text", "compact"])
    .optional()
    .default("full")
    .describe(
      "Output format: 'full' includes all cell data, 'text' returns just the text, 'compact' returns text with basic cursor info"
    ),
});

export type GetScreenInput = z.infer<typeof getScreenSchema>;

export interface CompactScreenState {
  width: number;
  height: number;
  cursor: { x: number; y: number; visible: boolean };
  text: string;
}

export function getScreen(
  sessionManager: SessionManager,
  input: GetScreenInput
): ScreenState | CompactScreenState | string {
  const session = sessionManager.getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  const state = session.renderer.getScreenState();

  switch (input.format) {
    case "text":
      return state.lines.map((l) => l.text).join("\n");

    case "compact":
      return {
        width: state.width,
        height: state.height,
        cursor: state.cursor,
        text: state.lines.map((l) => l.text).join("\n"),
      };

    case "full":
    default:
      return state;
  }
}
