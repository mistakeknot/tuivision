import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryResponder } from "../query-responder.js";
const cursor = { x: 0, y: 0 };
test("buffers CSI across chunks for CPR", () => {
    const responder = new QueryResponder(() => cursor);
    assert.deepEqual(responder.scan("\x1b"), []);
    assert.deepEqual(responder.scan("[6n"), ["\x1b[1;1R"]);
});
test("secondary DA does not trigger primary DA", () => {
    const responder = new QueryResponder(() => cursor);
    assert.deepEqual(responder.scan("\x1b[>c"), ["\x1b[>41;354;0c"]);
});
test("OSC 10/11/12 query handling for BEL and ST terminators", () => {
    const responder = new QueryResponder(() => cursor);
    assert.deepEqual(responder.scan("\x1b]10;?\x07"), ["\x1b]10;rgb:ffff/ffff/ffff\x1b\\"]);
    assert.deepEqual(responder.scan("\x1b]11;?\x1b\\"), ["\x1b]11;rgb:0000/0000/0000\x1b\\"]);
    assert.deepEqual(responder.scan("\x1b]12;?\x1b\\"), ["\x1b]12;rgb:ffff/ffff/ffff\x1b\\"]);
});
test("DECRQM returns not-set for arbitrary mode", () => {
    const responder = new QueryResponder(() => cursor);
    assert.deepEqual(responder.scan("\x1b[?25$p"), ["\x1b[?25;2$y"]);
});
//# sourceMappingURL=query-responder.test.js.map