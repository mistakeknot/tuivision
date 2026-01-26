import * as pty from "node-pty";
import { v4 as uuidv4 } from "uuid";
import { TerminalRenderer } from "./terminal-renderer.js";

export interface SessionOptions {
  command: string;
  args?: string[];
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
  cwd?: string;
}

export interface Session {
  id: string;
  pty: pty.IPty;
  renderer: TerminalRenderer;
  pid: number;
  createdAt: Date;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly sessionTimeoutMs: number;

  constructor(sessionTimeoutMs: number = 30 * 60 * 1000) {
    // Default 30 minute timeout
    this.sessionTimeoutMs = sessionTimeoutMs;
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    // Check for stale sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt.getTime() > this.sessionTimeoutMs) {
        this.closeSession(id);
      }
    }
  }

  spawn(options: SessionOptions): Session {
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
      env: env as Record<string, string>,
    });

    // Create terminal renderer
    const renderer = new TerminalRenderer(cols, rows);

    // Connect PTY output to renderer
    ptyProcess.onData((data: string) => {
      renderer.write(data);
    });

    const session: Session = {
      id,
      pty: ptyProcess,
      renderer,
      pid: ptyProcess.pid,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  sendInput(id: string, input: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    session.pty.write(input);
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    session.pty.resize(cols, rows);
    session.renderer.resize(cols, rows);
  }

  closeSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      return false;
    }

    try {
      session.pty.kill();
    } catch {
      // Process may already be dead
    }

    session.renderer.dispose();
    this.sessions.delete(id);
    return true;
  }

  listSessions(): Array<{ id: string; pid: number; createdAt: Date }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      pid: s.pid,
      createdAt: s.createdAt,
    }));
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    for (const id of this.sessions.keys()) {
      this.closeSession(id);
    }
  }
}
