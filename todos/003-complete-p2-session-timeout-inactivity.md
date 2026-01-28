---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, docs, reliability]
dependencies: []
---

# Align session timeout behavior with documentation

README states sessions close after 30 minutes of inactivity, but implementation closes sessions based on age since creation. This mismatch can terminate active long-running sessions unexpectedly.

## Problem Statement

The documentation promises inactivity-based cleanup, but the code uses creation time. Users running long-lived sessions may see sessions closed after 30 minutes even if they are active, and the docs are misleading.

## Findings

- Cleanup uses `createdAt` to determine staleness. `src/session-manager.ts:56-62`.
- There is no tracking of last activity (input or output) for a session.
- README claims sessions close after 30 minutes of inactivity. `README.md:211-213`.

## Proposed Solutions

### Option 1: Track activity timestamps

**Approach:** Add `lastActivityAt` to sessions, update on PTY data and input, and use that for cleanup.

**Pros:**
- Matches documented behavior
- Prevents closing active sessions

**Cons:**
- Slight additional state updates per data/input event

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Update documentation to match age-based timeout

**Approach:** Change README to say sessions close after 30 minutes since creation.

**Pros:**
- Minimal code change

**Cons:**
- Less user-friendly behavior remains

**Effort:** 15-30 minutes

**Risk:** Low

## Recommended Action

Track `lastActivityAt` per session (update on PTY output and on input) and use that for cleanup instead of `createdAt`. Update README to explicitly describe inactivity-based timeout and mention that any output or input resets the timer.

## Technical Details

**Affected files:**
- `src/session-manager.ts:56-62`
- `README.md:211-213`

**Related components:**
- `list_sessions` age reporting

## Resources

- `src/session-manager.ts` cleanup logic
- `README.md` limitations section

## Acceptance Criteria

- [x] Session timeout semantics are clear and accurate
- [x] If using inactivity, sessions no longer close during active use
- [x] Documentation reflects actual behavior

## Work Log

### 2026-01-28 - Implementation

**By:** Codex

**Actions:**
- Added `lastActivityAt` tracking and updated cleanup logic in `src/session-manager.ts`
- Added unit tests for inactivity-based cleanup in `src/session-manager.test.ts`
- Ran `npm run build` and `npm test`

**Learnings:**
- Inactivity-based cleanup is easiest to validate via injected sessions in tests

---

### 2026-01-28 - Initial Discovery

**By:** Codex

**Actions:**
- Compared README limitation text to cleanup implementation
- Identified mismatch between inactivity vs. age-based timeout
- Drafted solution options

**Learnings:**
- Current cleanup policy may interrupt long-running sessions unexpectedly
