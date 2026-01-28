import { z } from "zod";
import type { Session } from "../session-manager.js";

type SessionProvider = {
  getSession(id: string): Session | undefined;
};

export const waitForTextSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
  pattern: z.string().describe("Regex pattern to match against full screen text"),
  flags: z.string().optional().describe("Optional regex flags (e.g. 'i', 'm')"),
  timeout_ms: z.number().optional().default(10000).describe("Timeout in milliseconds"),
});

export type WaitForTextInput = z.input<typeof waitForTextSchema>;

export interface WaitForTextResult {
  found: boolean;
  elapsed_ms: number;
  screen_text: string;
  exited?: boolean;
  exit_code?: number;
}

export const waitForScreenChangeSchema = z.object({
  session_id: z.string().describe("Session ID from spawn_tui"),
  timeout_ms: z.number().optional().default(5000).describe("Timeout in milliseconds"),
  stable_ms: z
    .number()
    .optional()
    .default(300)
    .describe("Debounce duration with no visible text changes before resolving"),
});

export type WaitForScreenChangeInput = z.input<typeof waitForScreenChangeSchema>;

export interface WaitForScreenChangeResult {
  changed: boolean;
  elapsed_ms: number;
  screen_text: string;
  exited?: boolean;
  exit_code?: number;
}

const safeScreenText = (session: Session): string => {
  try {
    return session.renderer.getScreenText();
  } catch {
    return "";
  }
};

const buildExitPayload = (exitCode: number | null) =>
  exitCode === null ? {} : { exit_code: exitCode };

export async function waitForText(
  sessionManager: SessionProvider,
  input: WaitForTextInput
): Promise<WaitForTextResult> {
  const session = sessionManager.getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  let regex: RegExp;
  try {
    regex = new RegExp(input.pattern, input.flags);
  } catch (err) {
    throw new Error(`Invalid regex: ${(err as Error).message}`);
  }
  const matches = (text: string): boolean => {
    if (regex.global || regex.sticky) {
      regex.lastIndex = 0;
    }
    return regex.test(text);
  };

  const timeoutMs = input.timeout_ms ?? 10000;
  const start = Date.now();
  let lastText = safeScreenText(session);

  if (session.exited) {
    return {
      found: false,
      elapsed_ms: Date.now() - start,
      screen_text: lastText,
      exited: true,
      ...buildExitPayload(session.exitCode),
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const finish = (result: Omit<WaitForTextResult, "elapsed_ms" | "screen_text">) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      session.emitter.off("data", onData);
      session.emitter.off("exit", onExit);
      resolve({
        ...result,
        elapsed_ms: Date.now() - start,
        screen_text: lastText,
      });
    };

    const onData = () => {
      lastText = safeScreenText(session);
      if (matches(lastText)) {
        finish({ found: true });
      }
    };

    const onExit = (exitCode: number | null) => {
      lastText = safeScreenText(session);
      finish({
        found: false,
        exited: true,
        ...buildExitPayload(exitCode),
      });
    };

    session.emitter.on("data", onData);
    session.emitter.on("exit", onExit);

    lastText = safeScreenText(session);
    if (matches(lastText)) {
      finish({ found: true });
      return;
    }

    timeoutId = setTimeout(() => {
      finish({ found: false });
    }, timeoutMs);
  });
}

export async function waitForScreenChange(
  sessionManager: SessionProvider,
  input: WaitForScreenChangeInput
): Promise<WaitForScreenChangeResult> {
  const session = sessionManager.getSession(input.session_id);
  if (!session) {
    throw new Error(`Session not found: ${input.session_id}`);
  }

  const timeoutMs = input.timeout_ms ?? 5000;
  const stableMs = input.stable_ms ?? 300;
  const start = Date.now();
  let lastText = safeScreenText(session);
  const baseline = lastText;

  if (session.exited) {
    return {
      changed: false,
      elapsed_ms: Date.now() - start,
      screen_text: lastText,
      exited: true,
      ...buildExitPayload(session.exitCode),
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let stableId: NodeJS.Timeout | null = null;

    const finish = (result: Omit<WaitForScreenChangeResult, "elapsed_ms" | "screen_text">) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (stableId) {
        clearTimeout(stableId);
      }
      session.emitter.off("data", onData);
      session.emitter.off("exit", onExit);
      resolve({
        ...result,
        elapsed_ms: Date.now() - start,
        screen_text: lastText,
      });
    };

    const scheduleStable = () => {
      if (stableId) {
        clearTimeout(stableId);
      }
      stableId = setTimeout(() => {
        finish({ changed: true });
      }, stableMs);
    };

    const onData = () => {
      const nextText = safeScreenText(session);
      if (nextText !== lastText) {
        lastText = nextText;
        scheduleStable();
      }
    };

    const onExit = (exitCode: number | null) => {
      lastText = safeScreenText(session);
      const changed = lastText !== baseline;
      finish({
        changed,
        exited: true,
        ...buildExitPayload(exitCode),
      });
    };

    session.emitter.on("data", onData);
    session.emitter.on("exit", onExit);

    timeoutId = setTimeout(() => {
      finish({ changed: false });
    }, timeoutMs);
  });
}
