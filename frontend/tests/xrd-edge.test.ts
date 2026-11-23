// Edge cases of the experimental-pattern tools: odd file formats, awkward data, very large scans.
import assert from "node:assert/strict";
import { test } from "node:test";

import { findPeaks, parseElements, parseXrdFile, patternWarnings } from "../src/lib/xrd-match.ts";

const rows = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join("\n");

let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const pattern = (peaks: [number, number, number][], opts: { from?: number; to?: number; step?: number; noise?: number; bg?: number; hump?: [number, number, number] } = {}) => {
  const { from = 10, to = 90, step = 0.02, noise = 0.4, bg = 10, hump } = opts;
  const x: number[] = [];
  const y: number[] = [];
  for (let t = from; t <= to + 1e-9; t += step) {
    let v = bg + noise * gauss();
    for (const [c, h, w] of peaks) v += h * Math.exp(-((t - c) ** 2) / (2 * (w / 2.3548) ** 2));
    if (hump) v += hump[1] * Math.exp(-((t - hump[0]) ** 2) / (2 * (hump[2] / 2.3548) ** 2));
    x.push(+t.toFixed(4));
    y.push(Math.max(0, v));
  }
  return { x, y };
};

// ---------------------------------------------------------------- file formats
test("parseXrdFile: UTF-8 BOM, CRLF line endings, tabs, trailing spaces, scientific notation", () => {
  const body = rows(15, (i) => `${(20 + i * 0.5).toFixed(2)}\t${(1.5e2 + i).toExponential(3)}  `);
  const p = parseXrdFile("﻿" + body.replace(/\n/g, "\r\n") + "\r\n");
  assert.equal(p.twoTheta.length, 15, "the first line must not be lost to the BOM");
  assert.equal(p.twoTheta[0], 20);
  assert.ok(Math.abs(p.intensity[2] - 152) < 1e-9);
});

test("parseXrdFile: European decimal commas with whitespace or semicolon separators", () => {
  const ws = parseXrdFile(rows(12, (i) => `${(20 + i * 0.5).toFixed(1).replace(".", ",")} ${(100 + i).toFixed(1).replace(".", ",")}`));
  assert.equal(ws.twoTheta[1], 20.5);
  assert.equal(ws.intensity[1], 101);
  const semi = parseXrdFile(rows(12, (i) => `${(20 + i * 0.5).toFixed(1).replace(".", ",")};${100 + i}`));
  assert.equal(semi.twoTheta[3], 21.5);
});

test("parseXrdFile: CSV with a space after the comma, quoted header, and units line", () => {
  const p = parseXrdFile('"2Theta", "Counts"\n(deg), (cps)\n' + rows(12, (i) => `${20 + i}, ${5 + i}`));
  assert.equal(p.twoTheta.length, 12);
  assert.equal(p.intensity[0], 5);
});

test("parseXrdFile: instrument headers, section markers and comments are skipped; NaN / Infinity points are dropped", () => {
  const text = ["[Header]", "Sample=Fe powder", "; scan type: continuous", "[Data]", "20 5", "nan 7", "21 inf", ...Array.from({ length: 12 }, (_, i) => `${22 + i} ${10 + i}`)].join("\n");
  const p = parseXrdFile(text);
  assert.equal(p.twoTheta.length, 13);
  assert.ok(p.intensity.every(Number.isFinite));
});

test("parseXrdFile: duplicate 2θ values are averaged, negative counts kept, 3+ columns use the first two", () => {
  const text = rows(24, (i) => `${20 + Math.floor(i / 2)} ${i % 2 ? 10 : 20} 99 99`);
  const p = parseXrdFile(text);
  assert.equal(p.twoTheta.length, 12);
  assert.equal(p.intensity[0], 15);
  const neg = parseXrdFile(rows(12, (i) => `${20 + i} ${-5 + i}`));
  assert.equal(neg.intensity[0], -5);
});

test("parseXrdFile: binary / empty / one-column input gives a clear error", () => {
  assert.throws(() => parseXrdFile(""), /two numeric columns/i);
  assert.throws(() => parseXrdFile("PK\u0003\u0004\u0000\u0000binary\u0000junk"), /two numeric columns/i);
  assert.throws(() => parseXrdFile(rows(30, (i) => `${i}`)), /two numeric columns/i);
});

// ---------------------------------------------------------------- pattern sanity warnings
test("patternWarnings: radians / d-spacing / Q input, absurd range, narrow window, coarse step, all-zero counts", () => {
  const mk = (xs: number[], ys?: number[]) => ({ twoTheta: xs, intensity: ys ?? xs.map(() => 10) });
  const grid = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  assert.match(patternWarnings(mk(grid(0.3, 1.5, 200))).join(" "), /degrees|radians|d-spacing/i);
  assert.match(patternWarnings(mk(grid(10, 400, 400))).join(" "), /above 180/i);
  assert.match(patternWarnings(mk(grid(40, 46, 200))).join(" "), /narrow/i);
  assert.match(patternWarnings(mk(grid(10, 90, 60))).join(" "), /coarse|step/i);
  assert.match(patternWarnings(mk(grid(10, 90, 800), grid(10, 90, 800).map(() => 0))).join(" "), /no signal|flat|zero/i);
  const ok = grid(10, 90, 4000);
  assert.deepEqual(patternWarnings(mk(ok, ok.map((_, i) => 10 + (i % 50)))), []);
});

// ---------------------------------------------------------------- peak finding
test("findPeaks: noise only → (almost) nothing; flat or constant data → nothing", () => {
  const { x, y } = pattern([], { noise: 1.5 });
  assert.ok(findPeaks(x, y).length <= 1, "pure noise must not produce a peak list");
  assert.deepEqual(findPeaks(x, x.map(() => 100)), []);
  assert.deepEqual(findPeaks(x, x.map(() => 0)), []);
});

test("findPeaks: a broad amorphous hump is not reported as a Bragg peak; sharp lines on it are", () => {
  const { x, y } = pattern([[44.7, 800, 0.25], [65, 300, 0.25]], { hump: [30, 150, 14] });
  const found = findPeaks(x, y);
  assert.ok(found.every((p) => p.fwhm < 4), `broad feature reported: ${found.map((p) => `${p.twoTheta.toFixed(1)}(${p.fwhm.toFixed(1)})`)}`);
  assert.ok(found.some((p) => Math.abs(p.twoTheta - 44.7) < 0.05) && found.some((p) => Math.abs(p.twoTheta - 65) < 0.05));
});

test("findPeaks: non-uniform step (denser near a peak) gives the same positions as a uniform scan", () => {
  const uniform = pattern([[30, 500, 0.3], [50, 300, 0.3]], { step: 0.02, noise: 0.2 });
  const xs: number[] = [];
  for (let t = 10; t < 90; t += t > 28 && t < 32 ? 0.01 : 0.05) xs.push(+t.toFixed(4));
  const ys = xs.map((t) => 10 + 500 * Math.exp(-((t - 30) ** 2) / (2 * (0.3 / 2.3548) ** 2)) + 300 * Math.exp(-((t - 50) ** 2) / (2 * (0.3 / 2.3548) ** 2)));
  const a = findPeaks(uniform.x, uniform.y);
  const b = findPeaks(xs, ys);
  assert.equal(b.length, a.length, `${b.length} vs ${a.length}`);
  assert.ok(Math.abs(b[0].twoTheta - 30) < 0.03 && Math.abs(b[0].fwhm - 0.3) < 0.05, `peak ${b[0].twoTheta} fwhm ${b[0].fwhm}`);
});

test("findPeaks: very large scans (300 000 points) neither overflow the stack nor take long", () => {
  const { x, y } = pattern([[44.7, 800, 0.1], [65, 300, 0.1]], { from: 5, to: 155, step: 0.0005 });
  assert.ok(x.length > 290_000);
  const t0 = performance.now();
  const found = findPeaks(x, y);
  const ms = performance.now() - t0;
  console.log(`300k points: ${found.length} peaks in ${ms.toFixed(0)} ms`);
  assert.ok(found.some((p) => Math.abs(p.twoTheta - 44.7) < 0.03));
  assert.ok(ms < 3000, `${ms} ms`);
});

test("findPeaks: peaks at the very edges of the scan and tiny arrays do not crash", () => {
  const { x, y } = pattern([[10.05, 600, 0.2], [89.95, 600, 0.2], [50, 400, 0.2]]);
  assert.doesNotThrow(() => findPeaks(x, y));
  assert.ok(findPeaks(x, y).some((p) => Math.abs(p.twoTheta - 50) < 0.03));
  assert.deepEqual(findPeaks([], []), []);
  assert.deepEqual(findPeaks([1], [1]), []);
});

test("findPeaks: sensitivity — a 2 % line is found with minRelative 0.01 but not with the default", () => {
  const { x, y } = pattern([[40, 1000, 0.25], [60, 22, 0.25]], { noise: 0.3 });
  assert.ok(!findPeaks(x, y).some((p) => Math.abs(p.twoTheta - 60) < 0.05));
  assert.ok(findPeaks(x, y, { minRelative: 0.01 }).some((p) => Math.abs(p.twoTheta - 60) < 0.05));
});

// ---------------------------------------------------------------- element input
test("parseElements: symbols in any case, separators, formulas; rejects junk and too many", () => {
  assert.deepEqual(parseElements("Fe Si"), { elements: ["Fe", "Si"], error: null });
  assert.deepEqual(parseElements("fe, SI ; o"), { elements: ["Fe", "Si", "O"], error: null });
  assert.deepEqual(parseElements("Fe2O3"), { elements: ["Fe", "O"], error: null });
  assert.deepEqual(parseElements("LiFePO4").elements, ["Li", "Fe", "P", "O"]);
  assert.deepEqual(parseElements("Fe Fe fe").elements, ["Fe"]);
  assert.match(parseElements("Fe Si O N Cl").error ?? "", /at most 4|four/i);
  assert.match(parseElements("").error ?? "", /element/i);
  assert.match(parseElements("iron").error ?? "", /symbol/i);
  assert.match(parseElements("Fe 123").error ?? "", /symbol|element/i);
  assert.match(parseElements("Xx").error ?? "", /not an element|unknown/i);
});
