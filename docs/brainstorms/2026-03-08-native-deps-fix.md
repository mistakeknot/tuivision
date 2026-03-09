# Brainstorm: Fix Native Dependencies (node-pty, canvas)

**Bead:** Demarch-1mz
**Date:** 2026-03-08
**Status:** brainstorm

## Problem

tuivision ships without `node_modules/`. The bootstrap script (`scripts/start.sh`) runs `npm install` on first launch, which triggers node-gyp compilation for two native modules:

1. **`canvas` (v2.11.2)** — Cairo-based 2D rendering. Requires system dev libraries: `libcairo2-dev`, `libpango1.0-dev`, `libjpeg-dev`, `libgif-dev`, `librsvg2-dev`, plus `build-essential` and `python3`.
2. **`node-pty` (v1.0.0)** — PTY spawning. Requires C++ compiler and `node-gyp`.

This fails on machines without dev toolchains. Claude Code plugin users shouldn't need to install C compilers and Cairo headers just to use a plugin.

## Usage Analysis

### canvas — used in `src/screenshot.ts`
- `createCanvas()` — measure character widths, create PNG canvas
- `registerFont()` — optional monospace font registration
- `canvas.toBuffer("image/png")` — PNG encoding
- `CanvasRenderingContext2D` — 2D drawing

The module already has an SVG renderer (`renderToSvg()`) that needs zero native deps. PNG is the more visually accurate output but SVG works as a fallback.

### node-pty — used in `src/session-manager.ts`
- `pty.spawn()` — spawn PTY process
- `pty.IPty` — PTY lifecycle interface
- `ptyProcess.onData()`, `.write()`, `.resize()`, `.kill()`

node-pty is the core of tuivision — without a PTY, no TUI interaction is possible. This is non-optional.

## Options

### Canvas Replacement

| Option | Pros | Cons |
|--------|------|------|
| **A: `@napi-rs/canvas`** | Prebuilt binaries (no compilation), API-compatible with `canvas` | Larger download (~40MB), not 100% API-identical |
| **B: Make canvas optional** | Zero-dep fallback (SVG only), existing SVG renderer works | PNG screenshots unavailable without canvas, SVG less useful for LLMs |
| **C: Pure-JS PNG encoder** | No native deps at all | Would need to reimplement all the Canvas 2D drawing primitives — massive effort |
| **D: Sharp (libvips)** | Also prebuilt binaries | Different API, would need full rewrite of screenshot.ts, overkill for this use case |

**Recommendation: B (make canvas optional) with A as enhancement.**

Rationale: The SVG renderer already exists and works without canvas. Making canvas optional means tuivision always starts — even if canvas compilation fails. We can then optionally try `@napi-rs/canvas` as a prebuilt alternative. This gives us graceful degradation:

1. Try `@napi-rs/canvas` → PNG works (no compilation needed)
2. Try `canvas` → PNG works (needs compilation)
3. Neither available → SVG-only mode (always works)

### node-pty

| Option | Pros | Cons |
|--------|------|------|
| **A: Keep node-pty, improve error handling** | node-pty is well-maintained, prebuilt binaries exist for many platforms via prebuild-install | Still requires node-gyp fallback on some platforms |
| **B: Switch to `@homebridge/node-pty-prebuilt-multiarch`** | Prebuilt for more architectures | Fork, less maintained |
| **C: Use child_process with script/pty.js** | Pure JS, no native deps | Poor Windows support, worse ANSI handling, missing resize support |

**Recommendation: A (keep node-pty, improve error handling).**

node-pty v1.0+ includes prebuild-install which downloads prebuilt binaries for common platforms before falling back to compilation. The real issue is that `npm install` failures for node-pty are silent warnings in start.sh, but the server then crashes on first spawn. We should:
1. Check if node-pty loaded successfully at startup
2. Report a clear error if it didn't (not just crash on first `pty.spawn()`)
3. Update start.sh to flag when native compilation fails

## Proposed Architecture

```
screenshot.ts (modified)
├── Try import @napi-rs/canvas → use for PNG
├── Fallback: try import canvas → use for PNG
└── Fallback: SVG-only mode (renderToSvg always available)

session-manager.ts (keep as-is)
└── node-pty (rely on prebuild-install for prebuilt binaries)

start.sh (modified)
├── Try npm install with native deps
├── If canvas/node-pty fail to compile, warn but continue
└── Server starts in degraded mode if needed

package.json (modified)
├── Move canvas to optionalDependencies
├── Add @napi-rs/canvas to optionalDependencies
└── Keep node-pty in dependencies (it's required)
```

## Scope

- Modify `screenshot.ts` to dynamically import canvas with fallback
- Move `canvas` to `optionalDependencies` in package.json
- Add `@napi-rs/canvas` to `optionalDependencies`
- Create a canvas abstraction layer that tries both implementations
- Update `start.sh` to handle partial native dep failures gracefully
- Add startup health check that reports which features are available
- Bump version

## Out of Scope

- Windows node-pty support (already documented as Linux-centric)
- Replacing node-pty with pure-JS alternative
- Rewriting the PNG renderer in pure JS
