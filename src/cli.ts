#!/usr/bin/env node

/**
 * tuivision-cli - Command-line interface for TUI automation
 *
 * Single-shot mode (spawn, interact, capture in one command):
 *   tuivision run <command> [--cols N] [--rows N] [--wait MS] [--keys KEYS] [--screenshot PATH] [--screen]
 *
 * Interactive mode (daemon keeps sessions alive):
 *   tuivision daemon start
 *   tuivision spawn <command> [--cols N] [--rows N]
 *   tuivision input <session-id> [--text STRING] [--key KEY]
 *   tuivision screen <session-id> [--format text|compact|full]
 *   tuivision screenshot <session-id> [--output PATH]
 *   tuivision list
 *   tuivision close <session-id>
 */

import { writeFileSync, existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createServer, connect, Socket } from "net";
import { SessionManager } from "./session-manager.js";
import { renderToPng, renderToSvg } from "./screenshot.js";

const SOCKET_PATH = join(tmpdir(), "tuivision.sock");

function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function error(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

function translateKey(key: string): string {
  const keyMap: Record<string, string> = {
    "enter": "\r",
    "return": "\r",
    "tab": "\t",
    "escape": "\x1b",
    "esc": "\x1b",
    "backspace": "\x7f",
    "delete": "\x1b[3~",
    "up": "\x1b[A",
    "down": "\x1b[B",
    "right": "\x1b[C",
    "left": "\x1b[D",
    "home": "\x1b[H",
    "end": "\x1b[F",
    "pageup": "\x1b[5~",
    "pagedown": "\x1b[6~",
    "insert": "\x1b[2~",
    "f1": "\x1bOP",
    "f2": "\x1bOQ",
    "f3": "\x1bOR",
    "f4": "\x1bOS",
    "f5": "\x1b[15~",
    "f6": "\x1b[17~",
    "f7": "\x1b[18~",
    "f8": "\x1b[19~",
    "f9": "\x1b[20~",
    "f10": "\x1b[21~",
    "f11": "\x1b[23~",
    "f12": "\x1b[24~",
    "ctrl+c": "\x03",
    "ctrl+d": "\x04",
    "ctrl+z": "\x1a",
    "ctrl+l": "\x0c",
    "ctrl+a": "\x01",
    "ctrl+e": "\x05",
    "ctrl+k": "\x0b",
    "ctrl+u": "\x15",
    "ctrl+w": "\x17",
    "space": " ",
  };

  return keyMap[key.toLowerCase()] ?? key;
}

// ============== Single-shot mode ==============

async function run(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  if (!command) {
    error("Usage: tuivision run <command> [--cols N] [--rows N] [--wait MS] [--keys KEYS] [--screenshot PATH] [--screen]");
  }

  const cols = flags.cols ? parseInt(flags.cols as string, 10) : 80;
  const rows = flags.rows ? parseInt(flags.rows as string, 10) : 24;
  const wait = flags.wait ? parseInt(flags.wait as string, 10) : 500;
  const cwd = flags.cwd as string | undefined;

  const sm = new SessionManager();
  const session = sm.spawn({ command, cols, rows, cwd });

  // Wait for app to render
  await new Promise(resolve => setTimeout(resolve, wait));

  // Send keys if specified
  if (flags.keys) {
    const keys = (flags.keys as string).split(",");
    for (const key of keys) {
      const keyData = translateKey(key.trim());
      session.pty.write(keyData);
      // Small delay between keys
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    // Wait for keys to process
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Capture output
  const state = session.renderer.getScreenState();
  const result: Record<string, unknown> = {
    session_id: session.id,
    pid: session.pty.pid,
    cols,
    rows,
    command,
  };

  // Screenshot if requested
  if (flags.screenshot) {
    const screenshotPath = flags.screenshot as string;
    const format = screenshotPath.endsWith(".svg") ? "svg" : "png";
    if (format === "png") {
      writeFileSync(screenshotPath, renderToPng(state));
    } else {
      writeFileSync(screenshotPath, renderToSvg(state));
    }
    result.screenshot = screenshotPath;
  }

  // Screen text if requested
  if (flags.screen) {
    result.screen = state.lines.map(l => l.text).join("\n");
  }

  // Clean up
  sm.dispose();

  output(result);
}

// ============== Daemon mode ==============

let daemonSessionManager: SessionManager | null = null;

function handleDaemonCommand(cmd: {
  action: string;
  args?: Record<string, unknown>;
}): unknown {
  if (!daemonSessionManager) {
    daemonSessionManager = new SessionManager();
  }

  switch (cmd.action) {
    case "spawn": {
      const { command, cols = 80, rows = 24, cwd } = cmd.args as {
        command: string;
        cols?: number;
        rows?: number;
        cwd?: string;
      };
      const session = daemonSessionManager.spawn({ command, cols, rows, cwd });
      return {
        session_id: session.id,
        pid: session.pty.pid,
        cols,
        rows,
        command,
      };
    }

    case "input": {
      const { session_id, text, key, keys } = cmd.args as {
        session_id: string;
        text?: string;
        key?: string;
        keys?: string[];
      };
      const session = daemonSessionManager.getSession(session_id);
      if (!session) {
        throw new Error(`Session not found: ${session_id}`);
      }

      const sent: string[] = [];
      if (text) {
        session.pty.write(text);
        sent.push(`text: ${text}`);
      }
      if (key) {
        session.pty.write(translateKey(key));
        sent.push(`key: ${key}`);
      }
      if (keys) {
        for (const k of keys) {
          session.pty.write(translateKey(k));
          sent.push(`key: ${k}`);
        }
      }
      return { success: true, sent };
    }

    case "screen": {
      const { session_id, format = "text" } = cmd.args as {
        session_id: string;
        format?: string;
      };
      const session = daemonSessionManager.getSession(session_id);
      if (!session) {
        throw new Error(`Session not found: ${session_id}`);
      }

      const state = session.renderer.getScreenState();
      if (format === "text") {
        return state.lines.map(l => l.text).join("\n");
      } else if (format === "compact") {
        return {
          cols: state.width,
          rows: state.height,
          cursor: state.cursor,
          text: state.lines.map(l => l.text).join("\n"),
        };
      }
      return state;
    }

    case "screenshot": {
      const { session_id, output: outputPath, format = "png" } = cmd.args as {
        session_id: string;
        output?: string;
        format?: string;
      };
      const session = daemonSessionManager.getSession(session_id);
      if (!session) {
        throw new Error(`Session not found: ${session_id}`);
      }

      const state = session.renderer.getScreenState();
      const path = outputPath || `/tmp/tuivision-${session_id}.${format}`;

      if (format === "png") {
        writeFileSync(path, renderToPng(state));
      } else {
        writeFileSync(path, renderToSvg(state));
      }
      return { success: true, path, format };
    }

    case "list": {
      return { sessions: daemonSessionManager.listSessions() };
    }

    case "close": {
      const { session_id } = cmd.args as { session_id: string };
      const closed = daemonSessionManager.closeSession(session_id);
      return { success: closed, session_id };
    }

    case "close-all": {
      daemonSessionManager.dispose();
      daemonSessionManager = new SessionManager();
      return { success: true, message: "All sessions closed" };
    }

    case "shutdown": {
      if (daemonSessionManager) {
        daemonSessionManager.dispose();
      }
      return { success: true, message: "Daemon shutting down" };
    }

    default:
      throw new Error(`Unknown action: ${cmd.action}`);
  }
}

async function startDaemon(): Promise<void> {
  // Remove existing socket
  if (existsSync(SOCKET_PATH)) {
    unlinkSync(SOCKET_PATH);
  }

  const server = createServer((socket: Socket) => {
    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString();

      // Process complete messages (newline-delimited JSON)
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const cmd = JSON.parse(line);
          const result = handleDaemonCommand(cmd);

          if (cmd.action === "shutdown") {
            socket.write(JSON.stringify({ success: true }) + "\n");
            socket.end();
            server.close();
            process.exit(0);
          }

          socket.write(JSON.stringify(result) + "\n");
        } catch (err) {
          socket.write(JSON.stringify({ error: (err as Error).message }) + "\n");
        }
      }
    });
  });

  server.listen(SOCKET_PATH, () => {
    console.log(`Daemon listening on ${SOCKET_PATH}`);
    console.log("PID:", process.pid);
  });

  // Handle shutdown signals
  process.on("SIGINT", () => {
    if (daemonSessionManager) {
      daemonSessionManager.dispose();
    }
    server.close();
    if (existsSync(SOCKET_PATH)) {
      unlinkSync(SOCKET_PATH);
    }
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (daemonSessionManager) {
      daemonSessionManager.dispose();
    }
    server.close();
    if (existsSync(SOCKET_PATH)) {
      unlinkSync(SOCKET_PATH);
    }
    process.exit(0);
  });
}

async function sendToDaemon(cmd: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!existsSync(SOCKET_PATH)) {
      reject(new Error("Daemon not running. Start with: tuivision-cli daemon start"));
      return;
    }

    const socket = connect(SOCKET_PATH);
    let buffer = "";

    socket.on("connect", () => {
      socket.write(JSON.stringify(cmd) + "\n");
    });

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const result = JSON.parse(line);
          socket.end();
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch {
          // incomplete JSON, wait for more
        }
      }
    });

    socket.on("error", (err) => {
      reject(new Error(`Failed to connect to daemon: ${err.message}`));
    });
  });
}

// ============== CLI Commands (via daemon) ==============

async function spawn(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  if (!command) {
    error("Usage: tuivision spawn <command> [--cols N] [--rows N] [--cwd PATH]");
  }

  const result = await sendToDaemon({
    action: "spawn",
    args: {
      command,
      cols: flags.cols ? parseInt(flags.cols as string, 10) : 80,
      rows: flags.rows ? parseInt(flags.rows as string, 10) : 24,
      cwd: flags.cwd,
    },
  });

  output(result);
}

async function input(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const sessionId = positional[0];

  if (!sessionId) {
    error("Usage: tuivision input <session-id> [--text STRING] [--key KEY] [--keys KEY,KEY,...]");
  }

  const result = await sendToDaemon({
    action: "input",
    args: {
      session_id: sessionId,
      text: flags.text,
      key: flags.key,
      keys: flags.keys ? (flags.keys as string).split(",").map(k => k.trim()) : undefined,
    },
  });

  output(result);
}

async function screen(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const sessionId = positional[0];

  if (!sessionId) {
    error("Usage: tuivision screen <session-id> [--format text|compact|full]");
  }

  const result = await sendToDaemon({
    action: "screen",
    args: {
      session_id: sessionId,
      format: flags.format || "text",
    },
  });

  if (typeof result === "string") {
    console.log(result);
  } else {
    output(result);
  }
}

async function screenshot(args: string[]): Promise<void> {
  const { positional, flags } = parseArgs(args);
  const sessionId = positional[0];

  if (!sessionId) {
    error("Usage: tuivision screenshot <session-id> [--output PATH] [--format png|svg]");
  }

  const result = await sendToDaemon({
    action: "screenshot",
    args: {
      session_id: sessionId,
      output: flags.output,
      format: flags.format || "png",
    },
  });

  output(result);
}

async function list(): Promise<void> {
  const result = await sendToDaemon({ action: "list", args: {} });
  output(result);
}

async function close(args: string[]): Promise<void> {
  const { positional } = parseArgs(args);
  const sessionId = positional[0];

  if (!sessionId) {
    error("Usage: tuivision close <session-id>");
  }

  const result = await sendToDaemon({
    action: "close",
    args: { session_id: sessionId },
  });

  output(result);
}

async function closeAll(): Promise<void> {
  const result = await sendToDaemon({ action: "close-all", args: {} });
  output(result);
}

async function daemonStop(): Promise<void> {
  try {
    await sendToDaemon({ action: "shutdown", args: {} });
    console.log("Daemon stopped");
  } catch (err) {
    console.error((err as Error).message);
  }
}

function showHelp(): void {
  console.log(`
tuivision-cli - Command-line interface for TUI automation

SINGLE-SHOT MODE (all-in-one, no daemon needed):
  tuivision run <command> [options]
    --cols N            Terminal width (default: 80)
    --rows N            Terminal height (default: 24)
    --wait MS           Wait time before capture (default: 500)
    --keys KEY,KEY,...  Keys to send after spawning
    --screenshot PATH   Save screenshot to file
    --screen            Include screen text in output
    --cwd PATH          Working directory

  Example:
    tuivision run htop --cols 120 --rows 40 --wait 2000 --screenshot /tmp/htop.png
    tuivision run vim --keys i,h,e,l,l,o,escape,:,q,!,enter --screen

DAEMON MODE (persistent sessions):
  tuivision daemon start       Start the daemon (run in background)
  tuivision daemon stop        Stop the daemon

  tuivision spawn <command>    Start a TUI application
  tuivision input <id> ...     Send input to a session
  tuivision screen <id>        Get terminal content
  tuivision screenshot <id>    Capture terminal as image
  tuivision list               List active sessions
  tuivision close <id>         Close a session
  tuivision close-all          Close all sessions

Special Keys:
  enter, tab, escape, backspace, delete
  up, down, left, right, home, end, pageup, pagedown
  f1-f12, ctrl+c, ctrl+d, ctrl+z, ctrl+l, space
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const restArgs = args.slice(1);

  try {
    switch (command) {
      case "run":
        await run(restArgs);
        break;
      case "daemon":
        if (restArgs[0] === "start") {
          await startDaemon();
        } else if (restArgs[0] === "stop") {
          await daemonStop();
        } else {
          console.error("Usage: tuivision daemon start|stop");
          process.exit(1);
        }
        break;
      case "spawn":
        await spawn(restArgs);
        break;
      case "input":
        await input(restArgs);
        break;
      case "screen":
        await screen(restArgs);
        break;
      case "screenshot":
        await screenshot(restArgs);
        break;
      case "list":
        await list();
        break;
      case "close":
        await close(restArgs);
        break;
      case "close-all":
        await closeAll();
        break;
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;
      default:
        if (command) {
          console.error(`Unknown command: ${command}`);
        }
        showHelp();
        process.exit(command ? 1 : 0);
    }
  } catch (err) {
    error((err as Error).message);
  }
}

main();
