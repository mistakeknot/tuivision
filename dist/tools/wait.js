import { z } from "zod";
export const waitForTextSchema = z.object({
    session_id: z.string().describe("Session ID from spawn_tui"),
    pattern: z.string().describe("Regex pattern to match against full screen text"),
    flags: z.string().optional().describe("Optional regex flags (e.g. 'i', 'm')"),
    timeout_ms: z.number().optional().default(10000).describe("Timeout in milliseconds"),
});
export const waitForScreenChangeSchema = z.object({
    session_id: z.string().describe("Session ID from spawn_tui"),
    timeout_ms: z.number().optional().default(5000).describe("Timeout in milliseconds"),
    stable_ms: z
        .number()
        .optional()
        .default(300)
        .describe("Debounce duration with no visible text changes before resolving"),
});
const safeScreenText = (session) => {
    try {
        return session.renderer.getScreenText();
    }
    catch {
        return "";
    }
};
const buildExitPayload = (exitCode) => exitCode === null ? {} : { exit_code: exitCode };
export async function waitForText(sessionManager, input) {
    const session = sessionManager.getSession(input.session_id);
    if (!session) {
        throw new Error(`Session not found: ${input.session_id}`);
    }
    let regex;
    try {
        regex = new RegExp(input.pattern, input.flags);
    }
    catch (err) {
        throw new Error(`Invalid regex: ${err.message}`);
    }
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
        let timeoutId = null;
        const finish = (result) => {
            if (settled)
                return;
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
            if (regex.test(lastText)) {
                finish({ found: true });
            }
        };
        const onExit = (exitCode) => {
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
        if (regex.test(lastText)) {
            finish({ found: true });
            return;
        }
        timeoutId = setTimeout(() => {
            finish({ found: false });
        }, timeoutMs);
    });
}
export async function waitForScreenChange(sessionManager, input) {
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
        let timeoutId = null;
        let stableId = null;
        const finish = (result) => {
            if (settled)
                return;
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
        const onExit = (exitCode) => {
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
//# sourceMappingURL=wait.js.map