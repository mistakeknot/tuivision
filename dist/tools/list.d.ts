import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const listSessionsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
export interface SessionInfo {
    id: string;
    pid: number;
    created_at: string;
    age_seconds: number;
}
export declare function listSessions(sessionManager: SessionManager, _input: ListSessionsInput): {
    sessions: SessionInfo[];
};
//# sourceMappingURL=list.d.ts.map