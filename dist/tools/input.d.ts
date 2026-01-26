import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const sendInputSchema: z.ZodObject<{
    session_id: z.ZodString;
    input: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    keys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    keys?: string[] | undefined;
    input?: string | undefined;
    key?: string | undefined;
}, {
    session_id: string;
    keys?: string[] | undefined;
    input?: string | undefined;
    key?: string | undefined;
}>;
export type SendInputInput = z.infer<typeof sendInputSchema>;
export declare function sendInput(sessionManager: SessionManager, input: SendInputInput): {
    success: boolean;
    sent: string;
};
//# sourceMappingURL=input.d.ts.map