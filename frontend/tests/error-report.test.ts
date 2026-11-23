import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReport, clipReport, isIgnorable } from "../src/lib/error-report.ts";

test("clipReport accepts a normal report and strips query/hash from the path", () => {
  const r = clipReport({ kind: "error", message: "boom", path: "/materials?elements=Fe#x" });
  assert.deepEqual(r, { kind: "error", message: "boom", stack: undefined, digest: undefined, path: "/materials" });
});

test("clipReport rejects junk", () => {
  for (const bad of [null, 5, "x", {}, { kind: "error" }, { kind: "nope", message: "m" }, { kind: "error", message: "   " }]) {
    assert.equal(clipReport(bad), null);
  }
});

test("clipReport bounds every field and fixes odd paths", () => {
  const r = clipReport({ kind: "boundary", message: "m".repeat(5000), stack: "s".repeat(9000), digest: "d".repeat(99), path: "http://evil" })!;
  assert.equal(r.message.length, 300);
  assert.equal(r.stack!.length, 1500);
  assert.equal(r.digest!.length, 40);
  assert.equal(r.path, "/");
});

test("buildReport handles Error, string, object and nothing", () => {
  assert.equal(buildReport("error", new Error("bad"), "/steel")!.message, "bad");
  assert.equal(buildReport("rejection", "plain", "/steel")!.message, "plain");
  assert.equal(buildReport("rejection", { message: "obj" }, "/steel")!.message, "obj");
  assert.equal(buildReport("rejection", undefined, "/steel"), null);
  assert.equal(buildReport("rejection", null, "/steel"), null);
});

test("known noise is not reported", () => {
  assert.ok(isIgnorable("Script error."));
  assert.ok(isIgnorable("ResizeObserver loop completed with undelivered notifications."));
  assert.ok(isIgnorable("x", "at chrome-extension://abc/content.js"));
  assert.equal(buildReport("error", "Script error.", "/"), null);
  assert.equal(isIgnorable("Cannot read properties of undefined"), false);
});
