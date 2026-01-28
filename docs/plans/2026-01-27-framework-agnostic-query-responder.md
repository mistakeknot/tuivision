# Plan: Framework-Agnostic ANSI Query Responder

## Enhancement Summary

**Deepened on:** 2026-01-28
**Sections enhanced:** 4
**Research agents used:** Manual web research (no subagents available in Codex)

### Key Improvements
1. Added concrete parsing guidance tied to ECMA-48 byte classes (parameter/intermediate/final).
2. Clarified OSC query termination (BEL/ST) and CPR 1-based coordinates.
3. Added compatibility notes for conservative responses (Kitty, XTVERSION, DA).

### New Considerations Discovered
- OSC queries can terminate with BEL or ST and should be handled equivalently.
- XTVERSION and DECRQM queries are documented in terminal sequence references and should be treated as best-effort replies.

## Goal
Replace the brittle substring-matching query handler in `session-manager.ts` with a proper escape sequence parser, enable it by default, and add missing queries to support any TUI framework.

## Context

The current query handler in `session-manager.ts:129-157` uses `data.includes()` substring matching to detect ANSI queries from TUI apps. This has real bugs:

- **`\x1b[c` / `\x1b[>c` collision**: `includes('\x1b[c')` matches as a substring of `\x1b[>c` (secondary DA), causing both primary and secondary DA responses to fire on a single secondary DA query.
- **Hardcoded cursor position**: Always responds `ESC[1;1R` regardless of actual cursor location.
- **Opt-in by default**: Users must know to set `answer_queries: true`, which is a common "why does my app hang?" footgun.
- **Only tested with Bubble Tea**: Other frameworks (Textual, Ratatui/crossterm, ncurses) send additional queries not handled.

## Files to Modify

1. **`src/query-responder.ts`** (NEW) -- extracted query parser/responder module
2. **`src/session-manager.ts`** -- integrate new responder, flip `answerQueries` default to `true`
3. **`src/tools/spawn.ts`** -- update default for `answer_queries` schema
4. **`src/index.ts`** -- update default for `answer_queries`

## Implementation

### 1. Create `src/query-responder.ts`

A proper escape sequence scanner that:

- **Parses output byte-by-byte** using a small state machine (GROUND → ESC → CSI/OSC) instead of `data.includes()` substring matching
- **Input chunking note**: `node-pty` emits JS strings (code units). Maintain a small buffer of incomplete escape sequences between calls and treat parsing as byte-oriented over `\x00-\x7f` control bytes; do not assume UTF-8 sequence boundaries align to chunk boundaries.
- **Buffers across chunks**: maintain state and partial sequences between `scan()` calls; cap buffers to a small max (e.g., 4–8KB) to avoid unbounded growth on malformed input
- **Fixes the `\x1b[c` / `\x1b[>c` collision** -- state machine distinguishes CSI sequences by their full parameter/intermediate bytes
- **Dynamic cursor position** -- accepts a `getCursorPosition` callback to return actual cursor coords from the renderer, not hardcoded `1;1`
- **CPR coordinates are 1-based** -- convert renderer cursor (if 0-based) before replying with `ESC[{row};{col}R`
- **Handles these queries:**

| Query | Sequence | Response | Status |
|-------|----------|----------|--------|
| Cursor Position (CPR) | `ESC[6n` | `ESC[{row};{col}R` (dynamic) | Fix (was hardcoded) |
| Primary DA | `ESC[c` / `ESC[0c` | `ESC[?62;c` (VT220) | Fix (collision) |
| Secondary DA | `ESC[>c` / `ESC[>0c` | `ESC[>41;354;0c` (xterm) | Fix (collision) |
| BG color | `ESC]11;?` | `ESC]11;rgb:0000/0000/0000 ST` | Keep |
| FG color | `ESC]10;?` | `ESC]10;rgb:ffff/ffff/ffff ST` | Keep |
| **Cursor color** | `ESC]12;?` | `ESC]12;rgb:ffff/ffff/ffff ST` | **New** |
| **Tertiary DA** | `ESC[=c` | `ESC P!\|00000000 ST` | **New** |
| **XTVERSION** | `ESC[>0q` | `ESC P>\|TuiVision ST` | **New** |
| **Kitty keyboard** | `ESC[?u` | `ESC[?0u` (not supported) | **New** |
| **Mode query (DECRQM)** | `ESC[?{n}$p` | `ESC[?{n};2$y` (not set) | **New** |

**Out of scope (defer until a concrete need):**
- Mouse mode handling/queries (e.g. DECSET/DECRST 1000/1002/1006). The responder only answers explicit queries and returns "not set" for DECRQM; add mouse support only when a client requires it.

**Compatibility notes:**
- `answer_queries` will be **enabled by default** with explicit opt-out (`answer_queries: false`) to reduce hangs.
- The responder uses **explicit parameter vs intermediate byte handling** for CSI (params: `0-9`, `;`, `?`, `>`, `=`; intermediates: `0x20–0x2f`; final: `0x40–0x7e`).
- “New” replies (Kitty keyboard, XTVERSION, tertiary DA) are **conservative/unsupported** responses, not claims of full feature support.
- For DCS replies, spell out bytes explicitly in code to avoid escaping mistakes (e.g., `\x1bP!|00000000\x1b\\`).

Interface:
```typescript
export class QueryResponder {
  constructor(private getCursorPosition: () => { x: number; y: number }) {}

  // Scans data for queries, returns array of responses to write back
  scan(data: string): string[];
}
```

The state machine states:
- **GROUND**: Normal text. On `\x1b`, transition to ESC.
- **ESC**: Saw `\x1b`. On `[` → CSI_PARAM. On `]` → OSC. On `P` → DCS. Otherwise → GROUND.
- **CSI_PARAM**: Collecting parameter bytes (`0-9`, `;`, `?`, `>`, `=`). On intermediate bytes (`0x20–0x2f`), transition to CSI_INTERMEDIATE. On final byte (`0x40–0x7e`), match the complete CSI sequence and transition to GROUND.
- **CSI_INTERMEDIATE**: Collecting intermediate bytes (`0x20–0x2f`). On final byte (`0x40–0x7e`), match the complete CSI sequence and transition to GROUND.
- **OSC**: Collecting until ST (`\x1b\\` or `\x07`). Match the complete OSC sequence.
- **DCS**: Collecting until ST. (Passthrough, no queries expected inbound.)

### Research Insights

**Best Practices:**
- Treat OSC queries as terminated by either BEL (`\x07`) or ST (`\x1b\\`) and handle OSC 10/11/12 “?” queries consistently with xterm behavior.  
- CPR is `CSI 6 n`, with replies formatted as `CSI row ; col R` using 1-based coordinates.  
- CSI parsing should follow ECMA-48 byte classes: parameter bytes `0x30–0x3f`, intermediate bytes `0x20–0x2f`, and final bytes `0x40–0x7e`.

**Performance Considerations:**
- Use a streaming scan with small bounded buffers to avoid quadratic scans over large data chunks.

**Implementation Details:**
```typescript
// ECMA-48 framing (simplified)
// params: 0x30-0x3f, intermediates: 0x20-0x2f, final: 0x40-0x7e
// OSC terminators: BEL (\x07) or ST (\x1b\\)
```

**Edge Cases:**
- Split escape sequences across PTY chunks; retain partial buffer state.
- Multiple escape sequences in one chunk; emit multiple responses in order.

**References:**
- https://www.ecma-international.org/publications-and-standards/standards/ecma-48/
- https://invisible-island.net/xterm/ctlseqs/ctlseqs.html
- https://xtermjs.org/docs/api/vtfeatures/
- https://conemu.github.io/en/AnsiEscapeCodes.html
- https://sw.kovidgoyal.net/kitty/keyboard-protocol/
- https://contour-terminal.org/vt-extensions/vt-sequences/

### 2. Update `src/session-manager.ts`

- Import `QueryResponder`, create one per session passing `() => renderer.getScreenState().cursor`
- Replace the inline `if (options.answerQueries) { ... }` block (lines 129-157) with:
  ```typescript
  if (options.answerQueries !== false) {
    const responses = queryResponder.scan(data);
    for (const r of responses) ptyProcess.write(r);
  }
  ```
- Default changes from opt-in to opt-out (`answerQueries` defaults to `true`)

### Research Insights

**Best Practices:**
- Respond only to recognized queries; ignore unknown sequences to avoid unexpected side effects.

**Edge Cases:**
- If `answer_queries` is explicitly `false`, ensure no responses are written even when queries are detected.

### 3. Update `src/tools/spawn.ts` and `src/index.ts`

- Change `answer_queries` default from `false` to `true`
- Update description: "Auto-respond to ANSI terminal queries (enabled by default, set false to disable)"

### Research Insights

**Best Practices:**
- Make the default behavior safe (enabled) but provide a clear opt-out for compatibility.

## Build & Verify

```bash
pnpm run build          # compiles cleanly
pnpm test               # existing wait tests still pass
```

Manual verification:
- `spawn_tui` with a Bubble Tea app (e.g. `gum choose a b c`) with default flags (no explicit `answer_queries`) -- should work without hanging
- `spawn_tui` with `answer_queries: false` -- should disable responses (backward compat)
- `spawn_tui` with a simple ncurses app (e.g. `htop`) -- should render correctly

### Test Plan
- Add unit tests for `QueryResponder`:
  - CSI queries split across chunks (`ESC` then `[6n`)
  - `ESC[>c` does not trigger primary DA
  - OSC 10/11/12 with both BEL and ST terminators
  - DECRQM for arbitrary `n` returns `;2$y`

### Docs/Release Notes
- Update README or release notes to mention `answer_queries` default change and opt-out flag.

### Research Insights

**Edge Cases:**
- Validate OSC color queries (OSC 10/11/12 with `?`) and ensure responses terminate with BEL or ST.
