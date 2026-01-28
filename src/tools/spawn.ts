import { z } from "zod";
import type { SessionManager } from "../session-manager.js";

export const spawnTuiSchema = z.object({
  command: z.string().describe("Command to run (e.g., 'htop', 'python my_app.py')"),
  cols: z.number().optional().default(80).describe("Terminal width in columns"),
  rows: z.number().optional().default(24).describe("Terminal height in rows"),
  env: z.record(z.string()).optional().describe("Additional environment variables"),
  cwd: z.string().optional().describe("Working directory for the command"),
  use_script: z.boolean().optional().default(false).describe("Wrap in script for better TTY compat"),
  answer_queries: z.boolean().optional().default(true).describe("Auto-respond to ANSI terminal queries (enabled by default)"),
});

export type SpawnTuiInput = z.infer<typeof spawnTuiSchema>;

export function spawnTui(sessionManager: SessionManager, input: SpawnTuiInput) {
  const session = sessionManager.spawn({
    command: input.command,
    cols: input.cols,
    rows: input.rows,
    env: input.env,
    cwd: input.cwd,
    useScript: input.use_script,
    answerQueries: input.answer_queries,
  });

  return {
    session_id: session.id,
    pid: session.pid,
    cols: input.cols ?? 80,
    rows: input.rows ?? 24,
  };
}
