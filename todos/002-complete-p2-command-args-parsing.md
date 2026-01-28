---
status: complete
priority: p2
issue_id: "002"
tags: [code-review, usability, tooling]
dependencies: []
---

# Improve command/args handling for spawn_tui

`spawn_tui` only accepts a `command` string and falls back to naive whitespace splitting when args are not provided. This breaks quoted arguments and paths with spaces, and there is no structured `args` parameter exposed to callers.

## Problem Statement

Commands with quoted arguments or spaces in paths are parsed incorrectly, leading to unexpected behavior or failures. The MCP API does not expose a structured args array, so callers cannot avoid the naive split.

## Findings

- `SessionManager.spawn` splits `options.command` on whitespace when `args` is empty. `src/session-manager.ts:81-89`.
- `spawn_tui` schema does not expose an `args` array, so callers cannot pass structured arguments. `src/tools/spawn.ts:4-22`.
- Commands like `"./my app" --flag "value with spaces"` will be split incorrectly.

## Proposed Solutions

### Option 1: Add `args` to spawn_tui schema and pass through

**Approach:** Extend MCP schema and CLI to accept `args: string[]` and avoid splitting when args are provided.

**Pros:**
- Correctly handles spaces and quoting
- Backwards compatible for existing callers

**Cons:**
- Requires API change and doc updates

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Shell-parse the command string

**Approach:** Use a shell-quote parser to split `command` safely when `args` is absent.

**Pros:**
- Improves parsing without changing MCP API
- More robust for quoted arguments

**Cons:**
- Adds dependency and parsing complexity
- Still ambiguous for edge cases

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Add `args: string[]` to the `spawn_tui` schema and pass it through to `SessionManager.spawn`. Keep the current command string for backwards compatibility, but skip whitespace splitting when `args` is provided. Update README and CLI examples to show `args` usage for paths/flags with spaces.

## Technical Details

**Affected files:**
- `src/session-manager.ts:81-89`
- `src/tools/spawn.ts:4-22`
- `src/index.ts` spawn_tui schema (if adding args)
- `README.md` tool docs (if adding args)

**Related components:**
- CLI `tuivision run` and `tuivision spawn`

## Resources

- `src/session-manager.ts` spawn parsing
- `src/tools/spawn.ts` schema

## Acceptance Criteria

- [x] Commands with spaces/quotes execute correctly
- [x] MCP schema supports structured args or a robust parsing alternative
- [x] Docs reflect recommended usage

## Work Log

### 2026-01-28 - Implementation

**By:** Codex

**Actions:**
- Added `args` to `spawn_tui` schema and passthrough in `src/tools/spawn.ts` and `src/index.ts`
- Added unit tests for schema + passthrough in `src/tools/spawn.test.ts`
- Updated docs to mention `args` usage in `README.md`
- Ran `npm run build` and `npm test`

**Learnings:**
- Zod strips unknown keys by default; explicit schema fields are required

---

### 2026-01-28 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed spawn logic for command parsing
- Identified naive whitespace splitting and lack of args in schema
- Drafted solution options

**Learnings:**
- Current API makes it easy to send malformed commands with spaces
