import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { waitForText, waitForScreenChange } from "./wait.js";
class FakeRenderer {
    text;
    constructor(text) {
        this.text = text;
    }
    setText(text) {
        this.text = text;
    }
    getScreenText() {
        return this.text;
    }
}
class FakeSession {
    id;
    renderer;
    emitter;
    exited;
    exitCode;
    constructor(id, text) {
        this.id = id;
        this.renderer = new FakeRenderer(text);
        this.emitter = new EventEmitter();
        this.exited = false;
        this.exitCode = null;
    }
}
class FakeSessionManager {
    session;
    constructor(session) {
        this.session = session;
    }
    getSession(id) {
        if (id === this.session.id) {
            return this.session;
        }
        return undefined;
    }
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test("waitForText resolves immediately when pattern matches", async () => {
    const session = new FakeSession("s1", "hello world");
    const manager = new FakeSessionManager(session);
    const result = await waitForText(manager, {
        session_id: "s1",
        pattern: "hello",
        timeout_ms: 200,
    });
    assert.equal(result.found, true);
    assert.equal(result.screen_text, "hello world");
});
test("waitForText resolves when data arrives", async () => {
    const session = new FakeSession("s2", "before");
    const manager = new FakeSessionManager(session);
    const pending = waitForText(manager, {
        session_id: "s2",
        pattern: "after",
        timeout_ms: 500,
    });
    await delay(20);
    session.renderer.setText("after");
    session.emitter.emit("data", "after");
    const result = await pending;
    assert.equal(result.found, true);
    assert.equal(result.screen_text, "after");
});
test("waitForText resolves with exited when process exits", async () => {
    const session = new FakeSession("s3", "nope");
    const manager = new FakeSessionManager(session);
    const pending = waitForText(manager, {
        session_id: "s3",
        pattern: "never",
        timeout_ms: 500,
    });
    await delay(20);
    session.exited = true;
    session.exitCode = 7;
    session.emitter.emit("exit", 7, undefined);
    const result = await pending;
    assert.equal(result.found, false);
    assert.equal(result.exited, true);
    assert.equal(result.exit_code, 7);
});
test("waitForScreenChange resolves after screen stabilizes", async () => {
    const session = new FakeSession("s4", "one");
    const manager = new FakeSessionManager(session);
    const pending = waitForScreenChange(manager, {
        session_id: "s4",
        timeout_ms: 500,
        stable_ms: 30,
    });
    await delay(20);
    session.renderer.setText("two");
    session.emitter.emit("data", "two");
    const result = await pending;
    assert.equal(result.changed, true);
    assert.equal(result.screen_text, "two");
});
//# sourceMappingURL=wait.test.js.map