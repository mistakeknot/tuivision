import { z } from "zod";
import type { Session } from "../session-manager.js";
type SessionProvider = {
    getSession(id: string): Session | undefined;
};
export declare const waitForTextSchema: z.ZodObject<{
    session_id: z.ZodString;
    pattern: z.ZodString;
    flags: z.ZodOptional<z.ZodString>;
    timeout_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    pattern: string;
    timeout_ms: number;
    flags?: string | undefined;
}, {
    session_id: string;
    pattern: string;
    flags?: string | undefined;
    timeout_ms?: number | undefined;
}>;
export type WaitForTextInput = z.input<typeof waitForTextSchema>;
export interface WaitForTextResult {
    found: boolean;
    elapsed_ms: number;
    screen_text: string;
    exited?: boolean;
    exit_code?: number;
}
export declare const waitForScreenChangeSchema: z.ZodObject<{
    session_id: z.ZodString;
    timeout_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    stable_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    timeout_ms: number;
    stable_ms: number;
}, {
    session_id: string;
    timeout_ms?: number | undefined;
    stable_ms?: number | undefined;
}>;
export type WaitForScreenChangeInput = z.input<typeof waitForScreenChangeSchema>;
export interface WaitForScreenChangeResult {
    changed: boolean;
    elapsed_ms: number;
    screen_text: string;
    exited?: boolean;
    exit_code?: number;
}
export declare function waitForText(sessionManager: SessionProvider, input: WaitForTextInput): Promise<WaitForTextResult>;
export declare function waitForScreenChange(sessionManager: SessionProvider, input: WaitForScreenChangeInput): Promise<WaitForScreenChangeResult>;
export {};
//# sourceMappingURL=wait.d.ts.map