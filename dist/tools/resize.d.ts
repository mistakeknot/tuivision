import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const resizeSessionSchema: z.ZodObject<{
    session_id: z.ZodString;
    cols: z.ZodNumber;
    rows: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    cols: number;
    rows: number;
    session_id: string;
}, {
    cols: number;
    rows: number;
    session_id: string;
}>;
export type ResizeSessionInput = z.infer<typeof resizeSessionSchema>;
export declare function resizeSession(sessionManager: SessionManager, input: ResizeSessionInput): {
    success: boolean;
    cols: number;
    rows: number;
};
//# sourceMappingURL=resize.d.ts.map