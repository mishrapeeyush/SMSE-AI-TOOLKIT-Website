// Phase matching / peak analysis of experimental XRD patterns, checked against synthetic patterns built
// from the pymatgen-verified structures in tests/xrd_fixture.json (known phases, shift, broadening, noise).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { computeXrd, mergeNearbyPeaks, WAVELENGTHS, type XrdPeak, type XrdStructure } from "../src/lib/xrd.ts";
import { findPeaks, identifyPhases, parseXrdFile, rankCandidates, scherrerSize } from "../src/lib/xrd-match.ts";

const fixture: { formula: string; structure: XrdStructure }[] = JSON.parse(await readFile(new URL("xrd_fixture.json", import.meta.url), "utf8"));
const sim = (formula: string): XrdPeak[] => mergeNearbyPeaks(computeXrd(fixture.find((c) => c.formula === formula)!.structure, WAVELENGTHS.CuKa, [5, 100]));

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

/** Experimental-looking pattern: Gaussian lines of the given FWHM, sloping background, counting noise. */
function experiment(phases: { peaks: XrdPeak[]; weight: number }[], opts: { shift?: number; fwhm?: number; noise?: number } = {}) {
  const { shift = 0, fwhm = 0.25, noise = 0.4 } = opts;
  const sigma = fwhm / 2.3548;
  const x: number[] = [];
  const y: number[] = [];
  for (let t = 10; t <= 90; t += 0.02) {
    let v = 0;
    for (const { peaks, weight } of phases)
      for (const p of peaks) {
        const d = t - (p.twoTheta + shift);
        if (Math.abs(d) < 6 * sigma) v += weight * p.intensity * Math.exp(-(d * d) / (2 * sigma * sigma));
      }
    x.push(+t.toFixed(3));
    y.push(Math.max(0, v + 8 + 0.15 * (90 - t) + noise * gauss()));
  }
  return { twoTheta: x, intensity: y };
}

/** Lines within `tol` blend into one observed peak at their intensity-weighted centroid. */
function blended(peaks: XrdPeak[], tol: number): { twoTheta: number; intensity: number }[] {
  const out: { twoTheta: number; intensity: number; first: number }[] = [];
  for (const p of peaks) {
    const last = out[out.length - 1];
    if (last && p.twoTheta - last.first < tol) {
      last.twoTheta = (last.twoTheta * last.intensity + p.twoTheta * p.intensity) / (last.intensity + p.intensity);
      last.intensity += p.intensity;
    } else out.push({ twoTheta: p.twoTheta, intensity: p.intensity, first: p.twoTheta });
  }
  return out;
}

const candidates = ["Fe", "Si", "NaCl", "GaN", "ZrO2"].map((f) => ({ id: f, formula: f, peaks: sim(f) }));

test("findPeaks recovers every resolvable strong line of a noisy pattern within 0.05°", () => {
  // Lines closer than ~0.6 FWHM blend into one peak in any real pattern; the data also stops at 90°.
  const fe = blended(sim("Fe"), 0.15).filter((q) => q.twoTheta < 88);
  const exp = experiment([{ peaks: sim("Fe"), weight: 10 }], { shift: 0.1 });
  const found = findPeaks(exp.twoTheta, exp.intensity);
  for (const p of fe.filter((q) => q.intensity > 10)) {
    assert.ok(found.some((f) => Math.abs(f.twoTheta - (p.twoTheta + 0.1)) < 0.05), `missing Fe line at ${p.twoTheta.toFixed(2)}° (found ${found.map((f) => f.twoTheta.toFixed(2))})`);
  }
  assert.ok(found.length <= fe.filter((q) => q.intensity > 1).length + 1, `too many spurious peaks: ${found.length}`);
});

test("mixture of Fe + Si: both identified, others rejected, sample-displacement shift estimated", () => {
  const exp = experiment([{ peaks: sim("Fe"), weight: 10 }, { peaks: sim("Si"), weight: 6 }], { shift: 0.12 });
  const { identified, ranked } = identifyPhases(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]);
  console.log("mixture: " + ranked.map((r) => `${r.id} ${r.score.toFixed(2)} (shift ${r.shift.toFixed(2)}°)`).join(" | "));
  assert.deepEqual(new Set(identified.map((r) => r.id)), new Set(["Fe", "Si"]), "exactly the two phases that are present");
  assert.ok(Math.abs(identified[0].shift - 0.12) < 0.06);
});

test("single phase NaCl: identified alone with a high score; nothing else is reported", () => {
  const exp = experiment([{ peaks: sim("NaCl"), weight: 10 }], { shift: -0.08 });
  const { identified } = identifyPhases(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]);
  assert.deepEqual(identified.map((r) => r.id), ["NaCl"]);
  assert.ok(identified[0].score > 0.85, `score ${identified[0].score}`);
});

test("a phase whose strongest line is absent scores low even if weak lines coincide", () => {
  const si = sim("Si");
  const strongest = si.reduce((a, b) => (b.intensity > a.intensity ? b : a));
  const noStrong = si.filter((p) => p !== strongest);
  const exp = experiment([{ peaks: noStrong, weight: 10 }]);
  const { identified } = identifyPhases(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]);
  assert.ok(!identified.some((r) => r.id === "Si"), `identified: ${identified.map((r) => r.id)}`);
});

test("no peaks / empty input does not crash and scores 0", () => {
  const ranked = rankCandidates([], candidates, [10, 90]);
  assert.ok(ranked.every((r) => r.score === 0));
  assert.deepEqual(findPeaks([1, 2, 3], [1, 1, 1]), []);
});

test("Scherrer: recovers a 40 nm crystallite size from a simulated broadened line within 8%", () => {
  const fe = sim("Fe");
  const main = fe.reduce((a, b) => (b.intensity > a.intensity ? b : a));
  const lambda = WAVELENGTHS.CuKa;
  const theta = (main.twoTheta / 2) * (Math.PI / 180);
  const fwhmDeg = (((0.9 * lambda) / (400 * Math.cos(theta))) * 180) / Math.PI; // L = 400 Å
  const exp = experiment([{ peaks: [main], weight: 10 }], { fwhm: fwhmDeg, noise: 0.05 });
  const peak = findPeaks(exp.twoTheta, exp.intensity)[0];
  const L = scherrerSize(peak.fwhm, peak.twoTheta, lambda)!;
  console.log(`FWHM ${peak.fwhm.toFixed(3)}° (true ${fwhmDeg.toFixed(3)}°) → ${L.toFixed(1)} nm`);
  assert.ok(Math.abs(L - 40) / 40 < 0.08, `size ${L}`);
  // Instrumental broadening is subtracted in quadrature.
  assert.ok(scherrerSize(peak.fwhm, peak.twoTheta, lambda, { instrumentalFwhm: 0.08 })! > L);
  assert.equal(scherrerSize(0.05, 44, lambda, { instrumentalFwhm: 0.08 }), null); // narrower than the instrument: no size can be given
});

test("parseXrdFile: whitespace .xy with header, CSV, semicolon + decimal comma, .xye, descending order", () => {
  const ws = "# sample A\n2theta  counts\n10.0 5\n10.02 6\n" + Array.from({ length: 12 }, (_, i) => `${10.04 + i * 0.02} ${7 + i}`).join("\n");
  const a = parseXrdFile(ws);
  assert.equal(a.twoTheta.length, 14);
  assert.equal(a.intensity[0], 5);
  const csv = "Angle,Intensity\n" + Array.from({ length: 12 }, (_, i) => `${20 + i * 0.1},${i * 2}`).join("\n");
  assert.equal(parseXrdFile(csv).twoTheta.length, 12);
  const semi = Array.from({ length: 12 }, (_, i) => `${(20 + i * 0.1).toFixed(1).replace(".", ",")};${i},5`).join("\n");
  const s = parseXrdFile(semi);
  assert.equal(s.twoTheta[1], 20.1);
  assert.equal(s.intensity[1], 1.5); // "1,5" is a decimal comma
  const xye = Array.from({ length: 12 }, (_, i) => `${20 + i * 0.1} ${100 + i} ${Math.sqrt(100 + i)}`).join("\n");
  assert.equal(parseXrdFile(xye).intensity[3], 103);
  const desc = Array.from({ length: 12 }, (_, i) => `${30 - i * 0.1} ${i}`).join("\n");
  const d = parseXrdFile(desc);
  assert.ok(d.twoTheta[0] < d.twoTheta[11], "sorted ascending");
});

test("parseXrdFile rejects non-pattern input with a helpful message", () => {
  assert.throws(() => parseXrdFile("hello world\nthis is not data"), /two numeric columns/i);
  assert.throws(() => parseXrdFile("1 2\n3 4"), /at least/i);
});

test("DFT lattices are ~1.5% too large: real phases are still found, and the lattice scale is reported", () => {
  const scaled = (formula: string, k: number): XrdPeak[] => {
    const st = fixture.find((c) => c.formula === formula)!.structure;
    const m = st.lattice.matrix.map((row) => row.map((v) => v * k));
    return mergeNearbyPeaks(computeXrd({ ...st, lattice: { matrix: m } }, WAVELENGTHS.CuKa, [5, 100]));
  };
  // the measured sample has lattices 1.5 % smaller than the (DFT) candidate structures
  const exp = experiment([{ peaks: scaled("Fe", 0.985), weight: 10 }, { peaks: scaled("Si", 0.985), weight: 6 }], { shift: 0.05 });
  const { identified, ranked } = identifyPhases(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]);
  console.log("strained: " + ranked.map((r) => `${r.id} ${r.score.toFixed(2)} (a ${r.strain >= 0 ? "+" : ""}${(r.strain * 100).toFixed(1)}%)`).join(" | "));
  assert.deepEqual(new Set(identified.map((r) => r.id)), new Set(["Fe", "Si"]));
  assert.ok(identified.every((r) => Math.abs(r.strain - 0.015) < 0.006), `strain ${identified.map((r) => r.strain)}`);
});

test("allowing lattice scale does not let absent phases match by chance (phase-pure NaCl, strong noise)", () => {
  const exp = experiment([{ peaks: sim("NaCl"), weight: 10 }], { noise: 3 });
  const { identified, ranked } = identifyPhases(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]);
  console.log("noisy NaCl, independent scores: " + ranked.map((r) => `${r.id} ${r.score.toFixed(2)}`).join(", "));
  assert.deepEqual(identified.map((r) => r.id), ["NaCl"]);
});

test("rankCandidates keeps the independent per-phase scores (used for the 'other candidates' list)", () => {
  const exp = experiment([{ peaks: sim("Fe"), weight: 10 }]);
  const ranked = rankCandidates(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]);
  assert.equal(ranked[0].id, "Fe");
  assert.ok(ranked.every((r, i) => i === 0 || r.score <= ranked[i - 1].score));
});

test("robustness sweep: random lattice error, shift, width, noise and weights (deterministic seeds)", () => {
  const scaled = (f: string, k: number): XrdPeak[] => {
    const st = fixture.find((c) => c.formula === f)!.structure;
    return mergeNearbyPeaks(computeXrd({ ...st, lattice: { matrix: st.lattice.matrix.map((r) => r.map((v) => v * k)) } }, WAVELENGTHS.CuKa, [5, 100]));
  };
  seed = 11;
  let exact = 0;
  let falsePhases = 0;
  const cases = [["Fe"], ["NaCl"], ["GaN"], ["Fe", "Si"]];
  const runs = 15;
  for (const phases of cases)
    for (let i = 0; i < runs; i++) {
      const k = 1 - 0.02 * rnd(); // sample lattice 0–2 % smaller than the DFT structures
      const exp = experiment(
        phases.map((f) => ({ peaks: scaled(f, k), weight: 4 + rnd() * 8 })),
        { shift: (rnd() - 0.5) * 0.4, fwhm: 0.15 + rnd() * 0.35, noise: 0.3 + rnd() * 2.5 },
      );
      const got = new Set(identifyPhases(findPeaks(exp.twoTheta, exp.intensity), candidates, [10, 90]).identified.map((m) => m.id));
      const missing = phases.filter((f) => !got.has(f)).length;
      const extra = [...got].filter((f) => !phases.includes(f)).length;
      if (!missing && !extra) exact++;
      falsePhases += extra;
    }
  const total = cases.length * runs;
  console.log(`sweep: exact ${exact}/${total}, false phases ${falsePhases}`);
  assert.ok(exact >= total - 2, `exact ${exact}/${total}`);
  assert.ok(falsePhases <= 1, `false phases ${falsePhases}`);
});
