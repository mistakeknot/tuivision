import { test } from "node:test";
import assert from "node:assert/strict";

import { SessionManager } from "./session-manager.js";

class TestSessionManager extends SessionManager {
  public closed: string[] = [];

  override closeSession(id: string): boolean {
    this.closed.push(id);
    return true;
  }

  injectSession(session: any): void {
    (this as any).sessions.set(session.id, session);
  }

  runCleanup(): void {
    (this as any).cleanupStaleSessions();
  }
}

test("cleanup keeps session active when last activity is recent", () => {
  const manager = new TestSessionManager(50);
  const now = Date.now();

  manager.injectSession({
    id: "s1",
    createdAt: new Date(now - 1000),
    lastActivityAt: new Date(now - 10),
  });

  manager.runCleanup();

  assert.equal(manager.closed.length, 0);
});

test("cleanup uses last activity even if session is new", () => {
  const manager = new TestSessionManager(50);
  const now = Date.now();

  manager.injectSession({
    id: "s2",
    createdAt: new Date(now - 10),
    lastActivityAt: new Date(now - 1000),
  });

  manager.runCleanup();

  assert.deepEqual(manager.closed, ["s2"]);
});
