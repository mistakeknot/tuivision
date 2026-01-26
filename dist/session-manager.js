import * as pty from "node-pty";
import { v4 as uuidv4 } from "uuid";
import { TerminalRenderer } from "./terminal-renderer.js";
export class SessionManager {
    sessions = new Map();
    cleanupInterval = null;
    sessionTimeoutMs;
    constructor(sessionTimeoutMs = 30 * 60 * 1000) {
        // Default 30 minute timeout
        this.sessionTimeoutMs = sessionTimeoutMs;
        this.startCleanupInterval();
    }
    startCleanupInterval() {
        // Check for stale sessions every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleSessions();
        }, 5 * 60 * 1000);
    }
    cleanupStaleSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.createdAt.getTime() > this.sessionTimeoutMs) {
                this.closeSession(id);
            }
        }
    }
    spawn(options) {
        const id = uuidv4();
        const cols = options.cols ?? 80;
        const rows = options.rows ?? 24;
        // Parse command - if it contains spaces, split it
        let command = options.command;
        let args = options.args ?? [];
        if (args.length === 0 && command.includes(" ")) {
            const parts = command.split(/\s+/);
            command = parts[0];
            args = parts.slice(1);
        }
        // Merge environment
        const env = {
            ...process.env,
            TERM: "xterm-256color",
            COLORTERM: "truecolor",
            ...options.env,
        };
        // Spawn PTY
        const ptyProcess = pty.spawn(command, args, {
            name: "xterm-256color",
            cols,
            rows,
            cwd: options.cwd ?? process.cwd(),
            env: env,
        });
        // Create terminal renderer
        const renderer = new TerminalRenderer(cols, rows);
        // Connect PTY output to renderer
        ptyProcess.onData((data) => {
            renderer.write(data);
        });
        const session = {
            id,
            pty: ptyProcess,
            renderer,
            pid: ptyProcess.pid,
            createdAt: new Date(),
        };
        this.sessions.set(id, session);
        return session;
    }
    getSession(id) {
        return this.sessions.get(id);
    }
    sendInput(id, input) {
        const session = this.sessions.get(id);
        if (!session) {
            throw new Error(`Session not found: ${id}`);
        }
        session.pty.write(input);
    }
    resize(id, cols, rows) {
        const session = this.sessions.get(id);
        if (!session) {
            throw new Error(`Session not found: ${id}`);
        }
        session.pty.resize(cols, rows);
        session.renderer.resize(cols, rows);
    }
    closeSession(id) {
        const session = this.sessions.get(id);
        if (!session) {
            return false;
        }
        try {
            session.pty.kill();
        }
        catch {
            // Process may already be dead
        }
        session.renderer.dispose();
        this.sessions.delete(id);
        return true;
    }
    listSessions() {
        return Array.from(this.sessions.values()).map((s) => ({
            id: s.id,
            pid: s.pid,
            createdAt: s.createdAt,
        }));
    }
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        for (const id of this.sessions.keys()) {
            this.closeSession(id);
        }
    }
}
//# sourceMappingURL=session-manager.js.map