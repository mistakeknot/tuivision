# Plan: Fix Native Dependencies (node-pty, canvas)

**Bead:** Demarch-1mz
**Date:** 2026-03-08

## Steps

### 1. Create canvas abstraction layer (`src/canvas-loader.ts`)

Create a new module that dynamically imports canvas implementations with fallback:

1. Try `@napi-rs/canvas` (prebuilt binaries, no compilation)
2. Try `canvas` (requires node-gyp compilation)
3. Fall back to null (SVG-only mode)

Export a unified interface: `createCanvas`, `registerFont`, and a boolean `pngAvailable`.

**Files:** new `src/canvas-loader.ts`

### 2. Update `src/screenshot.ts` to use canvas abstraction

Replace the static `import { createCanvas, registerFont } from "canvas"` with the dynamic loader. Make `renderToPng()` throw a clear error when PNG is unavailable instead of crashing with a module-not-found error. Keep `renderToSvg()` unchanged (it has no native deps).

Export `pngAvailable` so callers can check before requesting PNG format.

**Files:** `src/screenshot.ts`

### 3. Update `src/tools/screenshot.ts` to handle PNG unavailability

When the user requests PNG format and canvas is unavailable, auto-fallback to SVG with a note in the response. Don't error — degrade gracefully.

**Files:** `src/tools/screenshot.ts`

### 4. Update `src/cli.ts` to handle PNG unavailability

Same graceful degradation for CLI screenshot commands.

**Files:** `src/cli.ts`

### 5. Update `package.json`

- Move `canvas` from `dependencies` to `optionalDependencies`
- Add `@napi-rs/canvas` to `optionalDependencies`
- Keep `node-pty` in `dependencies` (it's required)
- Bump version to `0.2.0`

**Files:** `package.json`

### 6. Update `scripts/start.sh`

- Remove the libgif-dev installation logic (no longer needed with prebuilt binaries)
- Add a post-install health check that logs which backends are available
- Make npm install failures for optional deps non-fatal

**Files:** `scripts/start.sh`

### 7. Add node-pty startup check in `src/index.ts`

Add a quick check at server startup that node-pty is loadable. If it fails, log a clear error message instead of crashing on first `pty.spawn()`.

**Files:** `src/index.ts`

### 8. Build and test

- Run `npm run build` to verify TypeScript compiles
- Run existing tests
- Verify the MCP server starts

### 9. Update documentation

Update CLAUDE.md design decisions to reflect the new optional canvas approach.

**Files:** `CLAUDE.md`
