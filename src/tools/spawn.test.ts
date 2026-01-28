import { test } from "node:test";
import assert from "node:assert/strict";

import { spawnTui, spawnTuiSchema } from "./spawn.js";

class FakeSessionManager {
  public seen: any[] = [];

  spawn(options: any): { id: string; pid: number } {
    this.seen.push(options);
    return { id: "s1", pid: 123 };
  }
}

test("spawnTuiSchema preserves args", () => {
  const parsed = spawnTuiSchema.parse({
    command: "echo",
    args: ["hello", "world"],
  } as any) as any;

  assert.deepEqual(parsed.args, ["hello", "world"]);
});

test("spawnTui passes args to SessionManager", () => {
  const manager = new FakeSessionManager();

  spawnTui(manager as any, {
    command: "echo",
    args: ["hello"],
  } as any);

  assert.deepEqual(manager.seen[0].args, ["hello"]);
});
