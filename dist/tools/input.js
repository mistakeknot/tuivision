import { z } from "zod";
// Key mappings for common special keys
const KEY_MAPPINGS = {
    enter: "\r",
    return: "\r",
    tab: "\t",
    escape: "\x1b",
    esc: "\x1b",
    backspace: "\x7f",
    delete: "\x1b[3~",
    up: "\x1b[A",
    down: "\x1b[B",
    right: "\x1b[C",
    left: "\x1b[D",
    home: "\x1b[H",
    end: "\x1b[F",
    pageup: "\x1b[5~",
    pagedown: "\x1b[6~",
    insert: "\x1b[2~",
    f1: "\x1bOP",
    f2: "\x1bOQ",
    f3: "\x1bOR",
    f4: "\x1bOS",
    f5: "\x1b[15~",
    f6: "\x1b[17~",
    f7: "\x1b[18~",
    f8: "\x1b[19~",
    f9: "\x1b[20~",
    f10: "\x1b[21~",
    f11: "\x1b[23~",
    f12: "\x1b[24~",
    space: " ",
    // Ctrl combinations
    "ctrl+c": "\x03",
    "ctrl+d": "\x04",
    "ctrl+z": "\x1a",
    "ctrl+l": "\x0c",
    "ctrl+a": "\x01",
    "ctrl+e": "\x05",
    "ctrl+k": "\x0b",
    "ctrl+u": "\x15",
    "ctrl+w": "\x17",
    "ctrl+r": "\x12",
};
export const sendInputSchema = z.object({
    session_id: z.string().describe("Session ID from spawn_tui"),
    input: z.string().optional().describe("Raw text to send to the terminal"),
    key: z
        .string()
        .optional()
        .describe("Special key to send: enter, tab, escape, backspace, delete, up, down, left, right, home, end, pageup, pagedown, f1-f12, ctrl+c, ctrl+d, etc."),
    keys: z
        .array(z.string())
        .optional()
        .describe("Multiple keys/inputs to send in sequence"),
});
export function sendInput(sessionManager, input) {
    const session = sessionManager.getSession(input.session_id);
    if (!session) {
        throw new Error(`Session not found: ${input.session_id}`);
    }
    const toSend = [];
    // Handle single key
    if (input.key) {
        const mapped = KEY_MAPPINGS[input.key.toLowerCase()];
        if (mapped) {
            toSend.push(mapped);
        }
        else {
            throw new Error(`Unknown key: ${input.key}. Available: ${Object.keys(KEY_MAPPINGS).join(", ")}`);
        }
    }
    // Handle raw input
    if (input.input) {
        toSend.push(input.input);
    }
    // Handle multiple keys
    if (input.keys) {
        for (const k of input.keys) {
            const mapped = KEY_MAPPINGS[k.toLowerCase()];
            if (mapped) {
                toSend.push(mapped);
            }
            else {
                // Treat as raw text
                toSend.push(k);
            }
        }
    }
    if (toSend.length === 0) {
        throw new Error("No input provided. Specify 'input', 'key', or 'keys'.");
    }
    const combined = toSend.join("");
    sessionManager.sendInput(input.session_id, combined);
    return {
        success: true,
        sent: combined.replace(/[\x00-\x1f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`),
    };
}
//# sourceMappingURL=input.js.map