# Code Patterns & Known Issues

## xterm.js Headless Import

The headless package exports CommonJS, so use:

```typescript
import xtermHeadless from "@xterm/headless";
const { Terminal } = xtermHeadless;
type TerminalType = InstanceType<typeof Terminal>;
```

## Color Extraction

Cell attribute methods return 0 or 1, not boolean:

```typescript
const bold = cell.isBold() === 1;
const fg = cell.getFgColor();     // 0-255 for palette
const isFgDefault = cell.isFgDefault();  // true if default fg
```

## Session Cleanup

Sessions auto-cleanup after 30 minutes. Manual cleanup:

```typescript
sessionManager.closeSession(sessionId);
sessionManager.dispose();  // Cleanup all sessions
```

## Known Issues

1. **node-canvas fonts**: May need system fonts installed for best rendering
2. **PTY on Windows**: node-pty has different behavior on Windows
3. **Large screens**: Very large terminal sizes may impact performance
4. **Bubble Tea apps**: Require `use_script: true` and `answer_queries: true` to render properly (they query terminal capabilities before rendering)
