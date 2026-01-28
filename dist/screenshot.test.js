import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFontFamily, DEFAULT_FONT_FAMILY } from "./screenshot.js";
test("resolveFontFamily prefers explicit fontFamily", () => {
    const result = resolveFontFamily({ fontFamily: "CustomMono" });
    assert.equal(result, "CustomMono");
});
test("resolveFontFamily falls back to default font", () => {
    const result = resolveFontFamily({});
    assert.equal(result, DEFAULT_FONT_FAMILY);
});
//# sourceMappingURL=screenshot.test.js.map