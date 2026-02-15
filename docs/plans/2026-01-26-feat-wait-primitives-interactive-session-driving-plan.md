---
title: "feat: Add wait primitives for interactive session driving"
type: feat
date: 2026-01-26
reviewed: true
---

# feat: Add wait primitives for interactive session driving

## Overview

Add two synchronization MCP tools (`wait_for_text` and `wait_for_screen_change`) that let callers wait for TUI applications to respond before taking the next action. This eliminates fragile `setTimeout` delays and enables reliable interactive driving of apps like Claude Code, htop, and Bubble Tea TUIs.

## Problem Statement / Motivation

tuivision can spawn, send input, and capture screens — but has no way to know when an app has finished rendering. Callers must guess delay times (the `run` command literally does `setTimeout(resolve, wait)` at `src/cli.ts:126`), leading to flaky automation.

## Proposed Solution

Two new MCP tools built on an **event-driven architecture** (not polling):

1. **`wait_for_text`** — Wait until a regex pattern matches the screen text
2. **`wait_for_screen_change`** — Wait until the screen stops changing (debounced)

Both fail-fast if the PTY process exits, and support configurable timeouts.

## Technical Approach

### Architecture

Event-driven via PTY data hook. Add a typed `EventEmitter` to `Session` that fires on every `ptyProcess.onData`. Wait tools subscribe to this emitter, check the screen state, and resolve when conditions are met.

### Tool Schemas

#### `wait_for_text`

```typescript
// Input
{
  session_id: string,
  pattern: string,           // regex matched against full screen text (lines joined by \n)
  flags?: string,            // optional regex flags (e.g. "i", "m")
  timeout_ms?: number,       // default 10000
}

// Output
{
  found: boolean,
  elapsed_ms: number,
  screen_text: string,       // last known full screen text at resolution time (always returned)
  exited?: boolean,          // true if process exited during wait
  exit_code?: number,        // present if exited
}
```

#### `wait_for_screen_change`

```typescript
// Input
{
  session_id: string,
  timeout_ms?: number,       // default 5000 (shorter: screen changes are expected to be fast)
  stable_ms?: number,        // default 300, debounce until no visible text changes for this duration
}

// Output
{
  changed: boolean,
  elapsed_ms: number,
  screen_text: string,       // last known full screen text at resolution time (always returned)
  exited?: boolean,
  exit_code?: number,
}
```

### Implementation

#### Step 1: Session infrastructure (`src/session-manager.ts`)

Add to `Session` interface:
- `exitCode: number | null`
- `exited: boolean`
- `emitter: TypedEventEmitter<SessionEvents>` (typed, not raw `EventEmitter`)

Define typed event map:

```typescript
import { EventEmitter } from "events";
import type TypedEmitter from "typed-emitter";

interface SessionEvents {
  data: [data: string];
  exit: [exitCode: number, signal: number | undefined];
}

type SessionEmitter = TypedEmitter<SessionEvents> & EventEmitter;
```

Instantiation note (in `spawn()`):
```typescript
const emitter = new EventEmitter() as SessionEmitter;
```

Wire up in `spawn()`:
- `ptyProcess.onData` → `emitter.emit("data", data)` (after `renderer.write()`)
- `ptyProcess.onExit` → set `exitCode`/`exited`, then `emitter.emit("exit", ...)`

Update `closeSession()`:
1. If `!session.exited`, set `exited=true`, `exitCode=null`, then emit `"exit"` so pending waits resolve
2. Wait one microtask for listeners to process
3. Call `emitter.removeAllListeners()`
4. Then dispose renderer and delete from map

#### Step 2: Extract `getScreenText()` onto `TerminalRenderer`

Currently duplicated 3 times across `src/tools/screen.ts:38`, `src/cli.ts:165`, `src/cli.ts:248`. Add a `getScreenText(): string` method to `TerminalRenderer` and use it everywhere. Wait tools use this method, not a local helper.

#### Step 3: Wait tool implementation (`src/tools/wait.ts`)

**`waitForText` flow (CRITICAL: subscribe-then-check order):**
1. Validate regex pattern (catch `new RegExp()` error → throw immediately)
2. If `session.exited === true`, resolve immediately with `{ found: false, exited: true, exit_code }`
3. Subscribe to `session.emitter` `"data"` and `"exit"` events
4. Check screen immediately — if condition already met, resolve and clean up
5. On each `"data"` event, get screen text, test regex. If matched, resolve.
6. On `"exit"` event, resolve with `{ found: false, exited: true, exit_code }`
7. On timeout, resolve with `{ found: false }` plus `screen_text` from last snapshot
8. Always clean up listeners (remove data/exit listeners, clear timeout)

> **Why subscribe-then-check:** Subscribing first, then checking avoids a TOCTOU race where data arrives between the initial check and listener registration.

**`waitForScreenChange` flow:**
1. If `session.exited === true`, resolve immediately with `{ changed: false, exited: true, exit_code }`
2. Subscribe to `session.emitter` `"data"` and `"exit"` events
3. Capture baseline via `renderer.getScreenText()`
4. On each `"data"` event, get screen text, compare to last snapshot
5. If visible text changed (ignore colors/attrs/cursor): update snapshot, reset `stable_ms` debounce timer
6. When debounce timer fires (no visible text changes for `stable_ms`), resolve with `{ changed: true }`
7. On `"exit"` event: if text differs from baseline, `{ changed: true, exited: true }`; otherwise `{ changed: false, exited: true }`
8. On timeout, resolve with `{ changed: false }` plus `screen_text` from last snapshot
9. Always clean up listeners

**Edge cases:**
- Invalid regex → throw immediately with clear error
- Regex flags → support optional `flags` input (do not parse `/.../flags` strings)
- Session not found → throw immediately
- `answerQueries` ANSI responses → ignored because debounce only resets on *visible text change* (compare `getScreenText()` before/after processing data)
- Session closed during wait → `"exit"` event fires from `closeSession()`, Promise resolves
- `exit_code` is only set when a real PTY exit occurs; for manual close, omit `exit_code` (keep `exited: true`)
- If session already exited, return `screen_text` as last snapshot if available, else empty string

#### Step 4: MCP registration + barrel export (`src/index.ts`, `src/tools/index.ts`)

Register both tools following existing pattern. Add `export * from "./wait.js"` to barrel.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/tools/wait.ts` | **CREATE** | `waitForText` and `waitForScreenChange` async tool functions |
| `src/session-manager.ts` | MODIFY | Add typed EventEmitter, exitCode, onExit to Session |
| `src/terminal-renderer.ts` | MODIFY | Add `getScreenText()` method (extract from duplicated code) |
| `src/index.ts` | MODIFY | Register two new MCP tools |
| `src/tools/index.ts` | MODIFY | Add barrel export |
| `src/tools/screen.ts` | MODIFY | Use `renderer.getScreenText()` instead of inline |
| `src/cli.ts` | MODIFY | Use `renderer.getScreenText()` instead of inline |
| `package.json` | MODIFY | Add `typed-emitter` to `devDependencies` (types only) |

**Not in scope (deferred):**
- CLI subcommands for wait tools (avoids async daemon handler refactor)
- `invert` parameter on `wait_for_text` (YAGNI — add when a real use case demands it)

## Acceptance Criteria

- [ ] `wait_for_text` resolves when regex matches screen text
- [ ] `wait_for_text` resolves immediately if pattern already matches
- [ ] `wait_for_screen_change` resolves after screen stabilizes for `stable_ms`
- [ ] Both tools fail-fast with `exited: true` when process exits during wait
- [ ] Both tools fail-fast with `exited: true` when session is already exited at call time
- [ ] Both tools return `found/changed: false` on timeout
- [ ] Invalid regex throws immediate error
- [ ] Session close during wait resolves the Promise (no leak/no disposed renderer access)
- [ ] Listeners always cleaned up (no EventEmitter leaks)
- [ ] Follows existing tool pattern (schema, type, function, barrel export)
- [ ] `getScreenText()` extracted to `TerminalRenderer`, no duplication

## Verification

```bash
pnpm build

# Via MCP (primary interface):
# 1. spawn_tui command="htop" use_script=true
# 2. wait_for_text session_id="..." pattern="CPU" timeout_ms=5000
#    → Should return found: true immediately
# 3. spawn_tui command="bash"
# 4. send_input session_id="..." input="echo hello\n"
# 5. wait_for_screen_change session_id="..." stable_ms=300
#    → Should resolve after "hello" appears
# 6. wait_for_text session_id="..." pattern="NONEXISTENT" timeout_ms=1000
#    → Should return found: false after 1 second
```

## References

- Brainstorm: `docs/brainstorms/2026-01-26-wait-primitives-brainstorm.md`
- intermute dual-channel pattern: `/root/projects/intermute/client/websocket.go:177-181`
- Existing tool pattern: `src/tools/screen.ts`
- Session spawn: `src/session-manager.ts:51-143`

## Review feedback applied

- Dropped `invert` parameter (YAGNI — all 3 reviewers)
- Dropped `exitSignal` field (never read — simplicity + Kieran)
- Dropped CLI support / Phase 4 (avoids async daemon refactor — all 3 reviewers)
- Fixed check-then-subscribe race → subscribe-then-check (Kieran: critical bug)
- Added typed EventEmitter instead of raw (Kieran: type safety)
- Extracted `getScreenText()` to TerminalRenderer (Kieran: 4th copy unacceptable)
- Specified closeSession ordering: emit → process → removeAllListeners → dispose (Kieran)
- Removed `stable_ms >= timeout_ms` validation (timeout handles it naturally — DHH + simplicity)
- Removed `timeout_ms: 0` special case (natural behavior is correct — simplicity)
- Collapsed 5 phases into 4 focused steps
- Clarified exit-during-screen-change semantics (no "or" — Kieran)
