import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFontFamily, initScreenshot } from "./screenshot.js";
test("resolveFontFamily prefers explicit fontFamily", () => {
    const result = resolveFontFamily({ fontFamily: "CustomMono" });
    assert.equal(result, "CustomMono");
});
test("resolveFontFamily falls back to default font before init", () => {
    // Before initScreenshot() is called, should return "monospace"
    const result = resolveFontFamily({});
    assert.equal(result, "monospace");
});
test("initScreenshot does not throw", async () => {
    // Should complete without error regardless of canvas availability
    await initScreenshot();
});
//# sourceMappingURL=screenshot.test.js.map