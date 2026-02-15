---
title: Wait Primitives for Interactive Session Driving
topic: synchronization-primitives
date: 2026-01-26
---

# Wait Primitives for Interactive Session Driving

## What We're Building

Two new MCP tools (`wait_for_text` and `wait_for_screen_change`) that let callers synchronize with TUI application state instead of relying on fixed `setTimeout` delays. This is the critical missing piece for driving interactive apps like Claude Code.

## Why This Approach

### Event-driven (chosen) over Polling

Three approaches were considered:

1. **Polling** — Timer-based `getScreenText()` checks. Simple but wastes CPU and introduces minimum latency equal to poll interval. Can miss rapid transient states.
2. **Event-driven** — Hook into PTY `onData` events. Zero-latency reaction, no wasted CPU. Requires adding an EventEmitter to Session (minimal change).
3. **Hybrid** — Event-driven + polling fallback. Most robust but unnecessary complexity — TUI content always changes via PTY data.

**Decision: Event-driven.** The modification to `session-manager.ts` is small (add EventEmitter, emit on `onData`), and the benefits are significant.

### Event-based debounce for `stable_ms`

For `wait_for_screen_change`, the `stable_ms` parameter needs debounce logic. Two options:

- **Simple post-change poll:** Detect change, wait `stable_ms`, compare again. Can miss rapid bursts.
- **Event-based debounce:** Reset a timer on each PTY data event. Resolve only when no new data arrives for `stable_ms`.

**Decision: Event-based debounce.** Inspired by intermute's exponential backoff pattern in `client/websocket.go` — wait for quiescence, not a fixed delay. More accurate for apps that emit output in bursts.

### Fail-fast on process exit

If the PTY process exits while a wait is active, should we wait for timeout or fail immediately?

**Decision: Fail fast.** Inspired by intermute's dual-channel select pattern (`c.done` + `ctx.Done()`) in `client/websocket.go:177-181`. Waiting on a dead process is always wrong. Add `exitCode` and `onExit` to Session, wire up `ptyProcess.onExit()`, and reject wait promises immediately.

## Key Decisions

1. **Event-driven architecture** — Subscribe to PTY data events, not polling timers
2. **Event-based debounce** — Reset stable timer on each data event for accurate quiescence detection
3. **Fail-fast exit detection** — Immediately reject waits when process exits
4. **Two tools only** — `wait_for_text` and `wait_for_screen_change`. No event streaming, no WebSockets, no state machines.
5. **First async tools** — These will be the first tool functions that return Promises (all existing tools are synchronous snapshots)

## Open Questions

- Should `wait_for_text` support regex in addition to literal string matching? (Plan says yes via `pattern` param)
- Should there be a max `timeout_ms` to prevent indefinite waits? (Probably not — caller's responsibility)
