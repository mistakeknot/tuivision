---
status: complete
priority: p2
issue_id: "001"
tags: [code-review, reliability, tooling]
dependencies: []
---

# Handle global/sticky regex state in wait_for_text

`wait_for_text` uses a user-provided RegExp instance repeatedly without resetting `lastIndex` when `g` or `y` flags are supplied. This can cause false negatives after the first match and make waits flaky or non-deterministic.

## Problem Statement

`wait_for_text` may incorrectly miss matches when callers pass regex flags like `g` or `y`. The RegExp state advances on each `test()` call, so subsequent checks can fail even when the screen text still matches. This undermines the reliability of the waiting primitive.

## Findings

- `waitForText` builds a single `RegExp` and calls `regex.test(lastText)` repeatedly. `src/tools/wait.ts:65-108`.
- When `g` or `y` are set in `input.flags`, `RegExp.test` advances `lastIndex`, which changes future results without any text changes.
- This leads to a false negative or delayed resolve in busy UIs that emit repeated data events.

## Proposed Solutions

### Option 1: Reset `lastIndex` before each test

**Approach:** If `regex.global` or `regex.sticky` is true, set `regex.lastIndex = 0` before each `test()` call.

**Pros:**
- Minimal change, low risk
- Preserves caller-supplied flags

**Cons:**
- Still uses stateful RegExp object

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Recreate RegExp without `g`/`y` for tests

**Approach:** Clone the RegExp for each test using flags minus `g` and `y`.

**Pros:**
- Eliminates statefulness entirely
- Predictable matching

**Cons:**
- Slight per-test overhead
- Needs careful flag handling

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Reset `regex.lastIndex = 0` before each `test()` when `regex.global` or `regex.sticky` is true. Add a unit test in `src/tools/wait.test.ts` to cover a `g`-flagged pattern that would otherwise fail on subsequent checks. This keeps behavior deterministic and avoids API changes.

## Technical Details

**Affected files:**
- `src/tools/wait.ts:65-108`

**Related components:**
- `wait_for_text` MCP tool

## Resources

- `src/tools/wait.ts` implementation

## Acceptance Criteria

- [x] Regex tests are deterministic even when `g`/`y` flags are provided
- [x] `wait_for_text` resolves correctly for repeated matches
- [x] Exception documented for missing failing test (approved by user on 2026-01-28)

## Work Log

### 2026-01-28 - Implementation

**By:** Codex

**Actions:**
- Reset `lastIndex` for global/sticky regex before testing in `wait_for_text`
- Ran `npm run build` and `npm test`
- Documented inability to craft a failing TDD test; user approved defensive change without failing test

**Learnings:**
- `wait_for_text` resolves on the first match, so `g`/`y` state is not observable in a failing test

---

### 2026-01-28 - TDD Feasibility Check

**By:** Codex

**Actions:**
- Attempted to craft a failing test for `g`/`y` regex flags in `wait_for_text`
- Determined current logic resolves on first match, so `lastIndex` state is not observable

**Learnings:**
- No reproducible failing test without changing behavior or adding new API surface
- Requires explicit decision on whether to allow a defensive change without a failing test

---

### 2026-01-28 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed `wait_for_text` implementation for regex handling
- Identified stateful `RegExp.test` behavior with `g`/`y` flags
- Drafted solution options

**Learnings:**
- Reusing a global/sticky RegExp across tests can cause false negatives
