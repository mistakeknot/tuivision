import { z } from "zod";
import type { SessionManager } from "../session-manager.js";
export declare const spawnTuiSchema: z.ZodObject<{
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    cols: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    rows: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
    use_script: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    answer_queries: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    cols: number;
    rows: number;
    command: string;
    use_script: boolean;
    answer_queries: boolean;
    cwd?: string | undefined;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
}, {
    command: string;
    cols?: number | undefined;
    rows?: number | undefined;
    cwd?: string | undefined;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    use_script?: boolean | undefined;
    answer_queries?: boolean | undefined;
}>;
export type SpawnTuiInput = z.infer<typeof spawnTuiSchema>;
export declare function spawnTui(sessionManager: SessionManager, input: SpawnTuiInput): {
    session_id: string;
    pid: number;
    cols: number;
    rows: number;
};
//# sourceMappingURL=spawn.d.ts.map