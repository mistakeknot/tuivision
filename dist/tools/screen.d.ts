import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
import type { ScreenState } from "../terminal-renderer.js";
export declare const getScreenSchema: z.ZodObject<{
    session_id: z.ZodString;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["full", "text", "compact", "annotated"]>>>;
    include_roles: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    format: "text" | "compact" | "full" | "annotated";
    include_roles: boolean;
}, {
    session_id: string;
    format?: "text" | "compact" | "full" | "annotated" | undefined;
    include_roles?: boolean | undefined;
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
export interface ScreenResponse {
    format: "full" | "text" | "compact" | "annotated";
    schema: number;
    content: ScreenState | CompactScreenState | string;
    note?: string;
}
export declare function getScreen(sessionManager: SessionManager, input: GetScreenInput): ScreenResponse;
//# sourceMappingURL=screen.d.ts.map