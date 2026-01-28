---
status: complete
priority: p3
issue_id: "004"
tags: [code-review, rendering]
dependencies: []
---

# Respect custom fontFamily in screenshot rendering

`renderToPng` unconditionally overwrites `options.fontFamily` with the auto-detected font, so callers cannot select a custom font even though the option exists in the API.

## Problem Statement

The `ScreenshotOptions` interface exposes `fontFamily`, but `renderToPng` ignores user input. This makes the option misleading and prevents callers from choosing a specific font for rendering.

## Findings

- `renderToPng` sets `opts.fontFamily = FONT_FAMILY` after merging options. `src/screenshot.ts:59-60`.
- Any supplied `options.fontFamily` is lost.
- `renderToSvg` uses a hard-coded font stack and does not share the same logic.

## Proposed Solutions

### Option 1: Only set fontFamily when not provided

**Approach:** Use `opts.fontFamily = options.fontFamily ?? FONT_FAMILY` or equivalent.

**Pros:**
- Minimal change
- Preserves documented API surface

**Cons:**
- None significant

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Expose font family option in tool schema

**Approach:** Add `font_family` to the MCP schema and pass through to renderer.

**Pros:**
- Enables configuration via MCP

**Cons:**
- API change and doc updates needed

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `src/screenshot.ts:55-66`
- `src/tools/screenshot.ts` (if exposing a new schema field)
- `README.md` (if exposing a new schema field)

## Resources

- `src/screenshot.ts` implementation

## Acceptance Criteria

- [x] `fontFamily` option is honored when provided
- [x] Rendering continues to use detected default when no font is specified

## Work Log

### 2026-01-28 - Implementation

**By:** Codex

**Actions:**
- Added `resolveFontFamily` helper and `DEFAULT_FONT_FAMILY` export in `src/screenshot.ts`
- Updated `renderToPng` to prefer caller-provided fontFamily
- Added unit tests in `src/screenshot.test.ts`
- Ran `npm run build` and `npm test`

**Learnings:**
- A small exported helper makes the behavior testable without mocking canvas

---

### 2026-01-28 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed screenshot rendering options
- Identified unconditional overwrite of `fontFamily`
- Drafted solution options

**Learnings:**
- Current API exposes a field that cannot be used by callers
