import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
import type { ScreenState } from "../terminal-renderer.js";
export declare const getScreenSchema: z.ZodObject<{
    session_id: z.ZodString;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["full", "text", "compact"]>>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    format: "text" | "compact" | "full";
}, {
    session_id: string;
    format?: "text" | "compact" | "full" | undefined;
}>;
export type GetScreenInput = z.infer<typeof getScreenSchema>;
export interface CompactScreenState {
    width: number;
    height: number;
    cursor: {
        x: number;
        y: number;
        visible: boolean;
    };
    text: string;
}
export declare function getScreen(sessionManager: SessionManager, input: GetScreenInput): ScreenState | CompactScreenState | string;
//# sourceMappingURL=screen.d.ts.map