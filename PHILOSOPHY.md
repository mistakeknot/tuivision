# tuivision Philosophy

## Purpose
TUI automation and visual testing - Playwright for terminal applications. Spawn, interact with, and screenshot TUI apps.

## North Star
Make terminal UI automation robust under real interaction timing: deterministic waits, reproducible captures, and low-flake execution.

## Working Priorities
- Deterministic waits
- Low flake rate
- Visual regression fidelity

## Brainstorming Doctrine
1. Start from outcomes and failure modes, not implementation details.
2. Generate at least three options: conservative, balanced, and aggressive.
3. Explicitly call out assumptions, unknowns, and dependency risk across modules.
4. Prefer ideas that improve clarity, reversibility, and operational visibility.

## Planning Doctrine
1. Convert selected direction into small, testable, reversible slices.
2. Define acceptance criteria, verification steps, and rollback path for each slice.
3. Sequence dependencies explicitly and keep integration contracts narrow.
4. Reserve optimization work until correctness and reliability are proven.

## Decision Filters
- Does this reduce ambiguity for future sessions?
- Does this improve reliability without inflating cognitive load?
- Is the change observable, measurable, and easy to verify?
- Can we revert safely if assumptions fail?

## Evidence Base
- Brainstorms analyzed: 1
- Plans analyzed: 2
- Source confidence: artifact-backed (1 brainstorm(s), 2 plan(s))
- Representative artifacts:
  - `docs/brainstorms/2026-01-26-wait-primitives-brainstorm.md`
  - `docs/plans/2026-01-26-feat-wait-primitives-interactive-session-driving-plan.md`
  - `docs/plans/2026-01-27-framework-agnostic-query-responder.md`
