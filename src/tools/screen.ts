import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
import type { ScreenState } from "../terminal-renderer.js";

export const getScreenSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
  format: z
    .enum(["full", "text", "compact", "annotated"])
    .optional()
    .default("compact")
    .describe(
      "Output format: 'annotated' for efficient color-aware output (recommended), 'text' for plain text, 'compact' for text + cursor, 'full' for raw cell data",
    ),
  include_roles: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include semantic role annotations in annotated format (forward-compatible stub, not yet active)",
    ),
});

export type GetScreenInput = z.infer<typeof getScreenSchema>;

export interface CompactScreenState {
  width: number;
  height: number;
  cursor: { x: number; y: number; visible: boolean };
  text: string;
}

export interface ScreenResponse {
  format: "full" | "text" | "compact" | "annotated";
  schema: number;
  content: ScreenState | CompactScreenState | string;
  note?: string;
}

export function getScreen(
  sessionManager: SessionManager,
  input: GetScreenInput,
): ScreenResponse {
  const session = sessionManager.getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  switch (input.format) {
    case "text":
      return {
        format: "text",
        schema: 1,
        content: session.renderer.getScreenText(),
      };

    case "compact": {
      const state = session.renderer.getScreenState();
      return {
        format: "compact",
        schema: 1,
        content: {
          width: state.width,
          height: state.height,
          cursor: state.cursor,
          text: state.lines.map((l) => l.text).join("\n"),
        },
      };
    }

    case "annotated":
      return {
        format: "annotated",
        schema: 1,
        content: session.renderer.getAnnotatedText({
          includeRoles: input.include_roles,
        }),
      };

    case "full":
    default:
      return {
        format: "full",
        schema: 1,
        content: session.renderer.getScreenState(),
      };
  }
}
