import { z } from "zod";
import type { SessionManager } from "../session-manager.js";

export const listSessionsSchema = z.object({});

export type ListSessionsInput = z.infer<typeof listSessionsSchema>;

export interface SessionInfo {
  id: string;
  pid: number;
  created_at: string;
  age_seconds: number;
}

export function listSessions(
  sessionManager: SessionManager,
  _input: ListSessionsInput
): { sessions: SessionInfo[] } {
  const sessions = sessionManager.listSessions();
  const now = Date.now();

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      pid: s.pid,
      created_at: s.createdAt.toISOString(),
      age_seconds: Math.floor((now - s.createdAt.getTime()) / 1000),
    })),
  };
}
