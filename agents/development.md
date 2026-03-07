# Development Setup

## Prerequisites

```bash
# System dependencies for node-canvas
apt install build-essential python3 libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev

# Node dependencies
npm install
```

## Build & Test

```bash
npm run build

# Quick test
node -e "
const { SessionManager } = require('./dist/session-manager.js');
const { renderToPng } = require('./dist/screenshot.js');
const fs = require('fs');

const sm = new SessionManager();
const s = sm.spawn({ command: 'htop', cols: 120, rows: 35 });
setTimeout(() => {
  const screen = s.renderer.getScreenState();
  fs.writeFileSync('/tmp/test.png', renderToPng(screen));
  console.log('Screenshot saved to /tmp/test.png');
  sm.dispose();
}, 2000);
"
```

## Claude Code Integration

Add to MCP configuration:

```json
{
  "mcpServers": {
    "tuivision": {
      "command": "node",
      "args": ["/root/projects/Interverse/plugins/tuivision/dist/index.js"]
    }
  }
}
```
