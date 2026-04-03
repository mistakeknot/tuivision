import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const getScreenshotSchema: z.ZodObject<{
    session_id: z.ZodString;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["png", "svg"]>>>;
    font_size: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    show_cursor: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    svg_mode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["per_cell", "merged"]>>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    format: "svg" | "png";
    font_size: number;
    show_cursor: boolean;
    svg_mode: "per_cell" | "merged";
}, {
    session_id: string;
    format?: "svg" | "png" | undefined;
    font_size?: number | undefined;
    show_cursor?: boolean | undefined;
    svg_mode?: "per_cell" | "merged" | undefined;
}>;
export type GetScreenshotInput = z.infer<typeof getScreenshotSchema>;
export interface ScreenshotResult {
    format: "png" | "svg";
    mime_type: string;
    data: string;
    width: number;
    height: number;
    note?: string;
}
export declare function getScreenshot(sessionManager: SessionManager, input: GetScreenshotInput): Promise<ScreenshotResult>;
//# sourceMappingURL=screenshot.d.ts.map