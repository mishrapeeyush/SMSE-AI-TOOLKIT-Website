import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchWithRetry } from "../src/lib/fetch-retry.ts";

const res = (status: number, headers: Record<string, string> = {}) => new Response(status === 200 ? "ok" : "no", { status, headers });
/** A scripted fetch: each call returns/throws the next item. */
const script = (items: (Response | Error)[]) => {
  const calls: number[] = [];
  const f = (async () => {
    calls.push(Date.now());
    const it = items[Math.min(calls.length - 1, items.length - 1)];
    if (it instanceof Error) throw it;
    return it.clone();
  }) as typeof fetch;
  return { f, calls };
};
const fast = { baseDelayMs: 5, maxDelayMs: 20 };

test("429 then 200: retried once and succeeds", async () => {
  const { f, calls } = script([res(429), res(200)]);
  const r = await fetchWithRetry("http://x", {}, { ...fast, fetchImpl: f });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2);
});

test("502/503/504 are retried; 404, 422 and 401 are not", async () => {
  for (const s of [502, 503, 504]) assert.equal((await fetchWithRetry("http://x", {}, { ...fast, fetchImpl: script([res(s), res(200)]).f })).status, 200, `${s}`);
  for (const s of [404, 422, 401, 400]) {
    const { f, calls } = script([res(s), res(200)]);
    assert.equal((await fetchWithRetry("http://x", {}, { ...fast, fetchImpl: f })).status, s);
    assert.equal(calls.length, 1, `${s} must not be retried`);
  }
});

test("persistent failure: gives back the last response after the allowed retries (no infinite loop)", async () => {
  const { f, calls } = script([res(503)]);
  const r = await fetchWithRetry("http://x", {}, { ...fast, retries: 2, fetchImpl: f });
  assert.equal(r.status, 503);
  assert.equal(calls.length, 3);
});

test("network error then success is retried; persistent network error is thrown", async () => {
  assert.equal((await fetchWithRetry("http://x", {}, { ...fast, fetchImpl: script([new TypeError("fetch failed"), res(200)]).f })).status, 200);
  await assert.rejects(fetchWithRetry("http://x", {}, { ...fast, fetchImpl: script([new TypeError("fetch failed")]).f }), /fetch failed/);
});

test("timeouts are not retried (they already waited the full time)", async () => {
  const err = Object.assign(new Error("timeout"), { name: "TimeoutError" });
  const { f, calls } = script([err, res(200)]);
  await assert.rejects(fetchWithRetry("http://x", {}, { ...fast, fetchImpl: f }), /timeout/);
  assert.equal(calls.length, 1);
});

test("Retry-After is honoured but capped", async () => {
  const { f, calls } = script([res(429, { "retry-after": "1" }), res(200)]);
  await fetchWithRetry("http://x", {}, { baseDelayMs: 5, maxDelayMs: 60, fetchImpl: f });
  const gap = calls[1] - calls[0];
  assert.ok(gap >= 50 && gap < 500, `waited ${gap} ms (cap 60)`);
  const big = script([res(429, { "retry-after": "3600" }), res(200)]);
  const t = Date.now();
  await fetchWithRetry("http://x", {}, { baseDelayMs: 5, maxDelayMs: 60, fetchImpl: big.f });
  assert.ok(Date.now() - t < 1000, "an hour-long Retry-After must be capped");
});
