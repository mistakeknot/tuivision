import * as pty from "node-pty";
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";
import type TypedEmitter from "typed-emitter";
import type { EventMap } from "typed-emitter";
import { TerminalRenderer } from "./terminal-renderer.js";
import { QueryResponder } from "./query-responder.js";

export interface SessionOptions {
  command: string;
  args?: string[];
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
  cwd?: string;
  useScript?: boolean;  // Wrap in script command for better TTY compatibility
  answerQueries?: boolean;  // Auto-respond to ANSI terminal queries (default: true)
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
      const lastActivity = session.lastActivityAt ?? session.createdAt;
      if (now - lastActivity.getTime() > this.sessionTimeoutMs) {
        this.closeSession(id);
      }
    }
  }

  spawn(options: SessionOptions): Session {
    const id = uuidv4();
    const cols = options.cols ?? 80;
    const rows = options.rows ?? 24;

    let command: string;
    let args: string[];

    if (options.useScript) {
      // Wrap in script for better TTY compatibility (helps Bubble Tea, etc.)
      // -q: quiet (no "Script started" message)
      // -c: command to run
      // /dev/null: discard the typescript file
      command = "script";
      args = ["-q", "-c", options.command, "/dev/null"];
    } else {
      // Parse command - if it contains spaces, split it
      command = options.command;
      args = options.args ?? [];

      if (args.length === 0 && command.includes(" ")) {
        const parts = command.split(/\s+/);
        command = parts[0];
        args = parts.slice(1);
      }
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

    const emitter = new EventEmitter() as SessionEmitter;

    const queryResponder = new QueryResponder(() => renderer.getScreenState().cursor);

    const session: Session = {
      id,
      pty: ptyProcess,
      renderer,
      pid: ptyProcess.pid,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      emitter,
      exited: false,
      exitCode: null,
    };

    // Connect PTY output to renderer, optionally answering ANSI queries
    ptyProcess.onData((data: string) => {
      session.lastActivityAt = new Date();
      renderer.write(data);
      emitter.emit("data", data);

      if (options.answerQueries !== false) {
        const responses = queryResponder.scan(data);
        for (const response of responses) {
          ptyProcess.write(response);
        }
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      if (!session.exited) {
        session.exited = true;
        session.exitCode = exitCode;
        emitter.emit("exit", exitCode, signal);
      } else if (session.exitCode === null) {
        session.exitCode = exitCode;
      }
    });

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
    session.lastActivityAt = new Date();
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

    if (!session.exited) {
      session.exited = true;
      session.exitCode = null;
      session.emitter.emit("exit", null, undefined);
    }

    try {
      session.pty.kill();
    } catch {
      // Process may already be dead
    }

    queueMicrotask(() => {
      session.emitter.removeAllListeners();
      session.renderer.dispose();
      this.sessions.delete(id);
    });
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
