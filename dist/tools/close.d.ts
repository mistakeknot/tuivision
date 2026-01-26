import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const closeSessionSchema: z.ZodObject<{
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    session_id: string;
}, {
    session_id: string;
}>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
export declare function closeSession(sessionManager: SessionManager, input: CloseSessionInput): {
    success: boolean;
    message: string;
};
//# sourceMappingURL=close.d.ts.map