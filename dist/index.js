#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { SessionManager } from "./session-manager.js";
import { initScreenshot, getCanvasBackend } from "./screenshot.js";
import { spawnTui, sendInput, getScreen, getScreenshot, waitForText, waitForScreenChange, closeSession, listSessions, resizeSession, } from "./tools/index.js";
// Startup checks
let ptyAvailable = true;
try {
    await import("node-pty");
}
catch (err) {
    ptyAvailable = false;
    console.error("FATAL: node-pty failed to load. TUI spawning will not work.\n" +
        "Ensure build tools are installed (build-essential on Linux, Xcode CLI on macOS).\n" +
        `Error: ${err.message}`);
}
// Initialize canvas backend (discovers @napi-rs/canvas or canvas)
await initScreenshot();
const canvasBackend = getCanvasBackend();
if (canvasBackend === "none") {
    console.error("Note: No canvas backend — PNG screenshots disabled, SVG available.");
}
else {
    console.error(`Screenshot backend: ${canvasBackend}`);
}
const server = new McpServer({
    name: "tuivision",
    version: "0.2.0",
});
const sessionManager = new SessionManager();
// Register spawn_tui tool
server.registerTool("spawn_tui", {
    title: "Spawn TUI",
    description: "Start a TUI application in a virtual terminal. Returns a session_id for subsequent operations.",
    inputSchema: {
        command: z
            .string()
            .describe("Command to run (e.g., 'htop', 'python my_app.py')"),
        args: z
            .array(z.string())
            .optional()
            .describe("Command arguments (recommended for spaces/quotes)"),
        cols: z
            .number()
            .optional()
            .describe("Terminal width in columns (default: 80)"),
        rows: z
            .number()
            .optional()
            .describe("Terminal height in rows (default: 24)"),
        env: z
            .record(z.string())
            .optional()
            .describe("Additional environment variables"),
        cwd: z.string().optional().describe("Working directory for the command"),
        use_script: z
            .boolean()
            .optional()
            .describe("Wrap in script for better TTY compat"),
        answer_queries: z
            .boolean()
            .optional()
            .describe("Auto-respond to ANSI terminal queries (enabled by default)"),
    },
}, async (input) => {
    try {
        const result = spawnTui(sessionManager, {
            command: input.command,
            args: input.args,
            cols: input.cols ?? 80,
            rows: input.rows ?? 24,
            env: input.env,
            cwd: input.cwd,
            use_script: input.use_script ?? false,
            answer_queries: input.answer_queries ?? true,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register send_input tool
server.registerTool("send_input", {
    title: "Send Input",
    description: "Send keystrokes to a TUI session. Supports raw text and special keys (enter, tab, escape, arrows, ctrl+c, etc.)",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
        input: z.string().optional().describe("Raw text to send to the terminal"),
        key: z
            .string()
            .optional()
            .describe("Special key: enter, tab, escape, backspace, up, down, left, right, ctrl+c, ctrl+d, f1-f12, etc."),
        keys: z
            .array(z.string())
            .optional()
            .describe("Multiple keys/inputs to send in sequence"),
    },
}, async (input) => {
    try {
        const result = sendInput(sessionManager, {
            session_id: input.session_id,
            input: input.input,
            key: input.key,
            keys: input.keys,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register get_screen tool
server.registerTool("get_screen", {
    title: "Get Screen",
    description: "Get terminal state. Use 'annotated' for efficient color-aware output (recommended), 'text' for plain text, 'compact' for text + cursor, 'full' for raw cell data.",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
        format: z
            .enum(["full", "text", "compact", "annotated"])
            .optional()
            .describe("Output format: annotated (color markers, recommended), text (plain), compact (text + cursor), full (all cell data)"),
        include_roles: z
            .boolean()
            .optional()
            .describe("Include semantic role annotations in annotated format (forward-compatible stub, not yet active)"),
    },
}, async (input) => {
    try {
        const result = getScreen(sessionManager, {
            session_id: input.session_id,
            format: input.format ??
                "compact",
            include_roles: input.include_roles ?? false,
        });
        const noteContent = result.note ? `\n\n${result.note}` : "";
        // String formats (text, annotated) — return as plain text for token efficiency
        if (result.format === "text" || result.format === "annotated") {
            return {
                content: [
                    { type: "text", text: result.content + noteContent },
                ],
            };
        }
        // Structured formats (full, compact) — JSON serialize the envelope
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register get_screenshot tool
server.registerTool("get_screenshot", {
    title: "Get Screenshot",
    description: "Render the terminal to an image. Returns base64-encoded PNG or raw SVG. Use this for visual inspection of TUI layout.",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
        format: z
            .enum(["png", "svg"])
            .optional()
            .describe("Image format (default: png)"),
        font_size: z
            .number()
            .optional()
            .describe("Font size in pixels (default: 14)"),
        show_cursor: z
            .boolean()
            .optional()
            .describe("Whether to show cursor (default: true)"),
        svg_mode: z
            .enum(["per_cell", "merged"])
            .optional()
            .describe("SVG rendering: 'per_cell' (default) or 'merged' (optimized, groups same-styled spans)"),
    },
}, async (input) => {
    try {
        const result = await getScreenshot(sessionManager, {
            session_id: input.session_id,
            format: input.format ?? "png",
            font_size: input.font_size ?? 14,
            show_cursor: input.show_cursor ?? true,
            svg_mode: input.svg_mode ?? "per_cell",
        });
        // Include degradation note if present
        const noteContent = result.note
            ? [{ type: "text", text: result.note }]
            : [];
        // Return image content for MCP
        if (result.format === "png") {
            return {
                content: [
                    ...noteContent,
                    {
                        type: "image",
                        data: result.data,
                        mimeType: result.mime_type,
                    },
                ],
            };
        }
        // SVG as text
        return {
            content: [...noteContent, { type: "text", text: result.data }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register wait_for_text tool
server.registerTool("wait_for_text", {
    title: "Wait For Text",
    description: "Wait until a regex pattern matches the current screen text.",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
        pattern: z
            .string()
            .describe("Regex pattern to match against full screen text"),
        flags: z
            .string()
            .optional()
            .describe("Optional regex flags (e.g. 'i', 'm')"),
        timeout_ms: z
            .number()
            .optional()
            .describe("Timeout in milliseconds (default: 10000)"),
    },
}, async (input) => {
    try {
        const result = await waitForText(sessionManager, {
            session_id: input.session_id,
            pattern: input.pattern,
            flags: input.flags,
            timeout_ms: input.timeout_ms,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register wait_for_screen_change tool
server.registerTool("wait_for_screen_change", {
    title: "Wait For Screen Change",
    description: "Wait until the screen stops changing (debounced).",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
        timeout_ms: z
            .number()
            .optional()
            .describe("Timeout in milliseconds (default: 5000)"),
        stable_ms: z
            .number()
            .optional()
            .describe("Debounce duration with no visible text changes (default: 300)"),
    },
}, async (input) => {
    try {
        const result = await waitForScreenChange(sessionManager, {
            session_id: input.session_id,
            timeout_ms: input.timeout_ms,
            stable_ms: input.stable_ms,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register close_session tool
server.registerTool("close_session", {
    title: "Close Session",
    description: "Close a TUI session and clean up resources.",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
    },
}, async (input) => {
    try {
        const result = closeSession(sessionManager, {
            session_id: input.session_id,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register list_sessions tool
server.registerTool("list_sessions", {
    title: "List Sessions",
    description: "List all active TUI sessions.",
    inputSchema: {},
}, async () => {
    try {
        const result = listSessions(sessionManager, {});
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Register resize_session tool
server.registerTool("resize_session", {
    title: "Resize Session",
    description: "Resize a TUI session's terminal dimensions.",
    inputSchema: {
        session_id: z.string().describe("Session ID from spawn_tui"),
        cols: z.number().describe("New terminal width in columns"),
        rows: z.number().describe("New terminal height in rows"),
    },
}, async (input) => {
    try {
        const result = resizeSession(sessionManager, {
            session_id: input.session_id,
            cols: input.cols,
            rows: input.rows,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});
// Handle graceful shutdown
process.on("SIGINT", () => {
    sessionManager.dispose();
    process.exit(0);
});
process.on("SIGTERM", () => {
    sessionManager.dispose();
    process.exit(0);
});
// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map