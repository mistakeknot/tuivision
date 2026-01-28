import * as pty from "node-pty";
import { EventEmitter } from "events";
import type TypedEmitter from "typed-emitter";
import type { EventMap } from "typed-emitter";
import { TerminalRenderer } from "./terminal-renderer.js";
export interface SessionOptions {
    command: string;
    args?: string[];
    cols?: number;
    rows?: number;
    env?: Record<string, string>;
    cwd?: string;
    useScript?: boolean;
    answerQueries?: boolean;
}
export interface Session {
    id: string;
    pty: pty.IPty;
    renderer: TerminalRenderer;
    pid: number;
    createdAt: Date;
    lastActivityAt: Date;
    emitter: SessionEmitter;
    exited: boolean;
    exitCode: number | null;
}
interface SessionEvents extends EventMap {
    data: (data: string) => void;
    exit: (exitCode: number | null, signal: number | undefined) => void;
}
type SessionEmitter = TypedEmitter<SessionEvents> & EventEmitter;
export declare class SessionManager {
    private sessions;
    private cleanupInterval;
    private readonly sessionTimeoutMs;
    constructor(sessionTimeoutMs?: number);
    private startCleanupInterval;
    private cleanupStaleSessions;
    spawn(options: SessionOptions): Session;
    getSession(id: string): Session | undefined;
    sendInput(id: string, input: string): void;
    resize(id: string, cols: number, rows: number): void;
    closeSession(id: string): boolean;
    listSessions(): Array<{
        id: string;
        pid: number;
        createdAt: Date;
    }>;
    dispose(): void;
}
export {};
//# sourceMappingURL=session-manager.d.ts.map