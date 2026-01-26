#!/usr/bin/env node
/**
 * tuivision-cli - Command-line interface for TUI automation
 *
 * Single-shot mode (spawn, interact, capture in one command):
 *   tuivision run <command> [--cols N] [--rows N] [--wait MS] [--keys KEYS] [--screenshot PATH] [--screen]
 *
 * Interactive mode (daemon keeps sessions alive):
 *   tuivision daemon start
 *   tuivision spawn <command> [--cols N] [--rows N]
 *   tuivision input <session-id> [--text STRING] [--key KEY]
 *   tuivision screen <session-id> [--format text|compact|full]
 *   tuivision screenshot <session-id> [--output PATH]
 *   tuivision list
 *   tuivision close <session-id>
 */
export {};
//# sourceMappingURL=cli.d.ts.map