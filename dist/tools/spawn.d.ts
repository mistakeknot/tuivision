import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const spawnTuiSchema: z.ZodObject<{
    command: z.ZodString;
    cols: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    rows: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cols: number;
    rows: number;
    command: string;
    env?: Record<string, string> | undefined;
    cwd?: string | undefined;
}, {
    command: string;
    cols?: number | undefined;
    rows?: number | undefined;
    env?: Record<string, string> | undefined;
    cwd?: string | undefined;
}>;
export type SpawnTuiInput = z.infer<typeof spawnTuiSchema>;
export declare function spawnTui(sessionManager: SessionManager, input: SpawnTuiInput): {
    session_id: string;
    pid: number;
    cols: number;
    rows: number;
};
//# sourceMappingURL=spawn.d.ts.map