# tuivision — Vision and Philosophy

**Version:** 0.1.0
**Last updated:** 2026-02-28

## What tuivision Is

tuivision is an MCP server that gives agents the ability to spawn, interact with, and screenshot terminal applications — "Playwright for TUIs." It wraps node-pty for PTY management, xterm.js for ANSI parsing, and node-canvas for PNG rendering into a single MCP server with a SessionManager that handles lifecycle and 30-minute auto-cleanup.

Before tuivision, TUI applications were a blind spot for agents: there was no way to verify that a CLI rendered correctly, that a prompt appeared in the right state, or that a terminal workflow produced the expected visual output. tuivision closes that gap by producing screenshots — durable, inspectable receipts of terminal state at any point in an interaction.

## Why This Exists

TUI applications are real software that real users interact with. Agents that can build TUI apps but cannot test them are operating on faith. tuivision exists because visual assertions on terminal output are the only honest measure of TUI correctness — text comparisons miss rendering artifacts, color encoding bugs, and layout regressions that are immediately visible in a screenshot. Measurement requires observation; tuivision makes observation possible.

## Design Principles

1. **Screenshots are receipts.** A screenshot is not just a debugging aid — it is evidence. Every interaction with a terminal session can be captured as a PNG, creating a durable, replayable record of what the agent saw. No receipt, no claim.

2. **Observe, don't interpret.** tuivision renders ANSI sequences faithfully using xterm.js (the same parser VS Code uses) and emits pixels. Interpretation — "did this look right?" — belongs to the agent or to a visual assertion layer above. tuivision's job is accurate observation.

3. **Sessions are ephemeral, artifacts are not.** PTY sessions auto-cleanup after 30 minutes. Screenshots and captured output survive. The session is a means to produce evidence; the evidence is what matters.

4. **Standalone and composable.** tuivision has no runtime dependencies on other Interverse plugins. It is a focused tool that does one thing: expose TUI state to agents. Other plugins or agent workflows compose with it; it does not compose internally.

5. **Failure is observable.** If a TUI crashes, hangs, or renders garbage, tuivision captures it. Surfacing failure is as important as confirming success.

## Scope

**Does:**
- Spawn terminal applications in managed PTY sessions via MCP tools
- Send input (keystrokes, sequences) to live sessions
- Capture current terminal state as PNG screenshots
- Report session status and manage session lifecycle

**Does not:**
- Parse or interpret screenshot content (that is the calling agent's concern)
- Provide visual diffing or assertion logic
- Manage display servers or graphics environments (node-canvas requires system deps, configured externally)
- Persist sessions beyond the 30-minute TTL

## Direction

- Expose richer session introspection: scrollback buffer access, cursor position, active cell content for hybrid visual + text assertions
- Enable event-driven capture: screenshot on output change rather than only on explicit agent request
- Support headless batch mode for CI integration — run a TUI workflow, capture a sequence of screenshots, assert against a fixture set
