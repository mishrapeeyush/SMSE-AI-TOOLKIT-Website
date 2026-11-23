import assert from "node:assert/strict";
import { test } from "node:test";

import { computeXrd, MAX_XRD_COST, WAVELENGTHS, xrdCost, type XrdStructure } from "../src/lib/xrd.ts";

const cell = (a: number, nSites: number): XrdStructure => ({
  lattice: { matrix: [[a, 0, 0], [0, a, 0], [0, 0, a]] },
  sites: Array.from({ length: nSites }, (_, i) => ({ species: [{ element: i % 2 ? "O" : "Si", occu: 1 }], abc: [((i * 37) % 97) / 97, ((i * 53) % 89) / 89, ((i * 71) % 83) / 83] })),
});

test("typical structures are far below the limit, huge supercells above it", () => {
  assert.ok(xrdCost(cell(5.43, 8), WAVELENGTHS.CuKa) < MAX_XRD_COST / 1000);
  assert.ok(xrdCost(cell(20, 200), WAVELENGTHS.AgKa) < MAX_XRD_COST); // measured ≈ 4 s: allowed
  assert.ok(xrdCost(cell(30, 400), WAVELENGTHS.AgKa) > MAX_XRD_COST); // measured ≈ 22 s: refused
});

test("cost grows with cell volume, atom count and 2θ range", () => {
  const base = xrdCost(cell(10, 20), WAVELENGTHS.CuKa);
  assert.ok(xrdCost(cell(20, 20), WAVELENGTHS.CuKa) > base);
  assert.ok(xrdCost(cell(10, 40), WAVELENGTHS.CuKa) > base);
  assert.ok(xrdCost(cell(10, 20), WAVELENGTHS.CuKa, [5, 60]) < base);
});

test("estimate tracks real run time to within a factor of ~4 (so the limit means what it says)", () => {
  const s = cell(15, 120);
  const t0 = performance.now();
  computeXrd(s, WAVELENGTHS.MoKa, [5, 90]);
  const seconds = (performance.now() - t0) / 1000;
  const predicted = xrdCost(s, WAVELENGTHS.MoKa, [5, 90]) / 1.5e7;
  console.log(`predicted ${predicted.toFixed(2)} s, measured ${seconds.toFixed(2)} s`);
  assert.ok(predicted / seconds < 4 && seconds / predicted < 4, `predicted ${predicted} vs measured ${seconds}`);
});
