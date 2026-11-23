import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError, apiGet } from "../src/lib/api.ts";

const realFetch = globalThis.fetch;
const withFetch = async (impl: typeof fetch, fn: () => Promise<void>) => {
  globalThis.fetch = impl;
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
  }
};

test("a network failure ('Failed to fetch') becomes a clear, actionable message with status 0", async () => {
  let calls = 0;
  await withFetch((async () => (calls++, Promise.reject(new TypeError("Failed to fetch")))) as typeof fetch, async () => {
    await assert.rejects(apiGet("/x"), (e: unknown) => {
      assert.ok(e instanceof ApiError);
      assert.equal(e.status, 0);
      assert.match(e.message, /could not reach the server/i);
      assert.doesNotMatch(e.message, /Failed to fetch/);
      return true;
    });
    assert.equal(calls, 2, "one automatic retry");
  });
});

test("a transient network failure followed by success is invisible to the caller", async () => {
  let calls = 0;
  await withFetch((async () => (++calls === 1 ? Promise.reject(new TypeError("Failed to fetch")) : Response.json({ ok: 1 }))) as typeof fetch, async () => {
    assert.deepEqual(await apiGet("/x", { a: 1 }), { ok: 1 });
  });
});

test("HTTP errors are not retried and keep the server's message", async () => {
  let calls = 0;
  await withFetch((async () => (calls++, Response.json({ detail: "DOI 10.1/x was not found." }, { status: 404 }))) as typeof fetch, async () => {
    await assert.rejects(apiGet("/citations", { doi: "10.1/x" }), /was not found/);
    assert.equal(calls, 1);
  });
});

test("an HTML error page from the platform gives a friendly message, not a JSON parse error", async () => {
  await withFetch((async () => new Response("<html>Bad gateway</html>", { status: 502 })) as typeof fetch, async () => {
    await assert.rejects(apiGet("/x"), /could not complete the request/i);
  });
});

test("a timeout is reported as 'took too long'", async () => {
  await withFetch((async () => Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" }))) as typeof fetch, async () => {
    await assert.rejects(apiGet("/x"), /took too long/i);
  });
});
