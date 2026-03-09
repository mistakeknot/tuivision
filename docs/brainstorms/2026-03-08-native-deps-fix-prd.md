# PRD: Fix Native Dependencies

**Bead:** Demarch-1mz
**Date:** 2026-03-08
**Type:** Bug fix
**Priority:** P2

## Problem Statement

tuivision plugin fails to start on systems without C/C++ build toolchains because `canvas` and `node-pty` require node-gyp compilation. Plugin users shouldn't need dev libraries installed.

## Solution

Make canvas optional with graceful fallback, and improve error handling for node-pty.

### Requirements

1. **Canvas optional import** — dynamically import canvas at runtime, falling back to SVG-only mode
2. **@napi-rs/canvas as prebuilt alternative** — try prebuilt binaries first, avoid compilation
3. **optionalDependencies** — move canvas deps to optionalDependencies so npm doesn't fail if they can't compile
4. **Startup health reporting** — log which screenshot backends are available on server start
5. **Improved start.sh** — handle partial installation failures without blocking server startup
6. **node-pty error clarity** — detect node-pty load failure at startup, not at first spawn

### Success Criteria

- tuivision starts successfully on a system with no C compiler installed
- PNG screenshots work when @napi-rs/canvas is available (no compilation)
- SVG screenshots always work as fallback
- Clear log messages indicate which features are available
- Existing functionality unchanged on systems where canvas compiles fine

### Non-Goals

- Windows support
- Replacing node-pty
- Pure-JS PNG rendering
