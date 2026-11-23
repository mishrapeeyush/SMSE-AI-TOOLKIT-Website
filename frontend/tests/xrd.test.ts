// Checks the in-browser XRD simulation against pymatgen's XRDCalculator.
// Fixture: backend/tests/make_xrd_fixture.py
//
// Both implementations merge reflections that fall in the same 1e-5° bin; for slightly
// distorted DFT cells, reflections can sit on a bin edge and be merged differently by
// floating-point noise. So patterns are compared after summing intensities in 0.01° bins —
// still far finer than any diffractometer's resolution.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { computeXrd, WAVELENGTHS, type Radiation, type XrdStructure } from "../src/lib/xrd.ts";

type Case = {
  formula: string;
  spacegroup: string;
  structure: XrdStructure;
  patterns: { radiation: Radiation; two_theta: number[]; intensity: number[]; d: number[] }[];
};

const cases: Case[] = JSON.parse(await readFile(new URL("xrd_fixture.json", import.meta.url), "utf8"));

function binned(twoTheta: number[], intensity: number[], width = 0.01) {
  const bins = new Map<number, number>();
  twoTheta.forEach((t, i) => {
    const k = Math.round(t / width);
    bins.set(k, (bins.get(k) ?? 0) + intensity[i]);
  });
  return bins;
}

for (const c of cases) {
  for (const p of c.patterns) {
    test(`${c.formula} (${c.spacegroup}) ${p.radiation} matches pymatgen`, () => {
      const peaks = computeXrd(c.structure, WAVELENGTHS[p.radiation]);
      const mine = binned(
        peaks.map((q) => q.twoTheta),
        peaks.map((q) => q.intensity),
      );
      const ref = binned(p.two_theta, p.intensity);
      for (const k of new Set([...mine.keys(), ...ref.keys()])) {
        // tolerate a reflection landing in the neighbouring 0.01° bin
        const near = (m: Map<number, number>) => (m.get(k - 1) ?? 0) + (m.get(k) ?? 0) + (m.get(k + 1) ?? 0);
        assert.ok(Math.abs(near(mine) - near(ref)) < 1e-3, `${(k * 0.01).toFixed(2)}°: ${near(mine)} vs ${near(ref)}`);
      }
      // Strongest line identical
      const top = peaks.reduce((x, y) => (y.intensity > x.intensity ? y : x));
      const iRef = p.intensity.indexOf(Math.max(...p.intensity));
      assert.ok(Math.abs(top.twoTheta - p.two_theta[iRef]) < 1e-3);
      assert.ok(Math.abs(top.d - p.d[iRef]) < 1e-4);
    });
  }
}

import { toXrdStructure } from "../src/lib/xrd.ts";

test("toXrdStructure keeps only what the simulation needs, and rejects malformed structures", () => {
  const raw = {
    "@module": "pymatgen.core.structure",
    lattice: { matrix: [[3, 0, 0], [0, 3, 0], [0, 0, 3]], a: 3, volume: 27 },
    sites: [{ species: [{ element: "Fe", occu: 1 }], abc: [0, 0, 0], xyz: [0, 0, 0], label: "Fe", properties: {} }],
  };
  assert.deepEqual(toXrdStructure(raw), { lattice: { matrix: raw.lattice.matrix }, sites: [{ abc: [0, 0, 0], species: [{ element: "Fe", occu: 1 }] }] });
  assert.equal(toXrdStructure(null), null);
  assert.equal(toXrdStructure({ lattice: { matrix: [[1, 0, 0]] }, sites: [] }), null);
  assert.equal(toXrdStructure({ lattice: raw.lattice, sites: [{ species: [], abc: [0, 0, 0] }] }), null);
});
