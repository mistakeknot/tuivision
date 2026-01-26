import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const getScreenshotSchema: z.ZodObject<{
    session_id: z.ZodString;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["png", "svg"]>>>;
    font_size: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    show_cursor: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    format: "png" | "svg";
    font_size: number;
    show_cursor: boolean;
}, {
    session_id: string;
    format?: "png" | "svg" | undefined;
    font_size?: number | undefined;
    show_cursor?: boolean | undefined;
}>;
export type GetScreenshotInput = z.infer<typeof getScreenshotSchema>;
export interface ScreenshotResult {
    format: "png" | "svg";
    mime_type: string;
    data: string;
    width: number;
    height: number;
}
export declare function getScreenshot(sessionManager: SessionManager, input: GetScreenshotInput): ScreenshotResult;
//# sourceMappingURL=screenshot.d.ts.map