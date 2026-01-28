import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnTui, spawnTuiSchema } from "./spawn.js";
class FakeSessionManager {
    seen = [];
    spawn(options) {
        this.seen.push(options);
        return { id: "s1", pid: 123 };
    }
}
test("spawnTuiSchema preserves args", () => {
    const parsed = spawnTuiSchema.parse({
        command: "echo",
        args: ["hello", "world"],
    });
    assert.deepEqual(parsed.args, ["hello", "world"]);
});
test("spawnTui passes args to SessionManager", () => {
    const manager = new FakeSessionManager();
    spawnTui(manager, {
        command: "echo",
        args: ["hello"],
    });
    assert.deepEqual(manager.seen[0].args, ["hello"]);
});
//# sourceMappingURL=spawn.test.js.map