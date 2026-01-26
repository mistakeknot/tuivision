import { z } from "zod";
export const listSessionsSchema = z.object({});
export function listSessions(sessionManager, _input) {
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
//# sourceMappingURL=list.js.map