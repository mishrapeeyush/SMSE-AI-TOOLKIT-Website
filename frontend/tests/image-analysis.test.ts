// Accuracy of grain-size and porosity measurement on synthetic microstructures with known truth.
import assert from "node:assert/strict";
import { test } from "node:test";

import { analyseGrains, analysePorosity, otsu } from "../src/lib/image-analysis.ts";
import { syntheticGrains, syntheticPores } from "../src/lib/synthetic-microstructure.ts";

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

test("grain size: planimetric and intercept within 6% over 16 random structures", () => {
  const areaErr: number[] = [];
  const intErr: number[] = [];
  for (let i = 0; i < 16; i++) {
    const n = 30 + i * 12; // 30 … 210 grains in 384×384 px
    const { image, truth } = syntheticGrains(384, 384, n, 100 + i);
    const g = analyseGrains(image);
    areaErr.push(Math.abs(g.meanArea - truth.meanArea) / truth.meanArea);
    intErr.push(Math.abs(g.meanIntercept - truth.meanIntercept) / truth.meanIntercept);
  }
  console.log(
    `grain size — mean abs error: planimetric ${(mean(areaErr) * 100).toFixed(2)}% (max ${(Math.max(...areaErr) * 100).toFixed(2)}%), ` +
      `intercept ${(mean(intErr) * 100).toFixed(2)}% (max ${(Math.max(...intErr) * 100).toFixed(2)}%)`,
  );
  assert.ok(Math.max(...areaErr) < 0.06, `planimetric max error ${Math.max(...areaErr)}`);
  assert.ok(Math.max(...intErr) < 0.06, `intercept max error ${Math.max(...intErr)}`);
});

test("porosity within 1.5 percentage points over 16 random structures (2–40% porous)", () => {
  const err: number[] = [];
  for (let i = 0; i < 16; i++) {
    const target = 0.02 + i * 0.025;
    const { image, truth } = syntheticPores(384, 384, target, 300 + i);
    const p = analysePorosity(image);
    err.push(Math.abs(p.porosity - truth.porosity));
  }
  console.log(`porosity — mean abs error ${(mean(err) * 100).toFixed(2)} pp (max ${(Math.max(...err) * 100).toFixed(2)} pp)`);
  assert.ok(Math.max(...err) < 0.015, `max error ${Math.max(...err)}`);
});

test("Otsu separates a bimodal histogram", () => {
  const data = new Uint8Array(1000).map((_, i) => (i < 500 ? 50 : 200));
  const t = otsu({ w: 1000, h: 1, data });
  assert.ok(t >= 50 && t < 200);
});

// ---- uneven illumination (a common problem in real SEM / optical micrographs) ----
import { flattenBackground, type Gray } from "../src/lib/image-analysis.ts";

/** Add a left-to-right brightness ramp of `ramp` grey levels (deterministic). */
const withRamp = (img: Gray, ramp: number): Gray => ({
  ...img,
  data: Uint8Array.from(img.data, (v, i) => Math.max(0, Math.min(255, Math.round(v + ramp * ((i % img.w) / img.w - 0.5))))),
});

test("uneven illumination: flattening keeps grain-size error under 8% (120-level ramp)", () => {
  const raw: number[] = [];
  const fixed: number[] = [];
  for (let i = 0; i < 8; i++) {
    const { image, truth } = syntheticGrains(384, 384, 60 + i * 20, 100 + i);
    const ramped = withRamp(image, 120);
    raw.push(Math.abs(analyseGrains(ramped).meanArea - truth.meanArea) / truth.meanArea);
    fixed.push(Math.abs(analyseGrains(flattenBackground(ramped)).meanArea - truth.meanArea) / truth.meanArea);
  }
  console.log(`grains, 120-level ramp: error ${(mean(raw) * 100).toFixed(1)}% without correction → ${(mean(fixed) * 100).toFixed(1)}% with`);
  assert.ok(mean(raw) > 0.1, "the ramp should actually hurt the uncorrected analysis (otherwise this test proves nothing)");
  assert.ok(Math.max(...fixed) < 0.08, `max error ${Math.max(...fixed)}`);
});

test("uneven illumination: flattening keeps porosity error under 1.5 points (120-level ramp)", () => {
  const raw: number[] = [];
  const fixed: number[] = [];
  for (let i = 0; i < 8; i++) {
    const { image, truth } = syntheticPores(384, 384, 0.05 + i * 0.04, 300 + i);
    const ramped = withRamp(image, 120);
    raw.push(Math.abs(analysePorosity(ramped).porosity - truth.porosity) * 100);
    fixed.push(Math.abs(analysePorosity(flattenBackground(ramped)).porosity - truth.porosity) * 100);
  }
  console.log(`porosity, 120-level ramp: error ${mean(raw).toFixed(2)} pp without correction → ${mean(fixed).toFixed(2)} pp with`);
  assert.ok(mean(raw) > 3, "the ramp should actually hurt the uncorrected analysis");
  assert.ok(Math.max(...fixed) < 1.5, `max error ${Math.max(...fixed)} pp`);
});

test("flattening does not degrade clean images (same limits as the unflattened tests)", () => {
  const g: number[] = [];
  const p: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = syntheticGrains(384, 384, 60 + i * 20, 100 + i);
    g.push(Math.abs(analyseGrains(flattenBackground(a.image)).meanArea - a.truth.meanArea) / a.truth.meanArea);
    const b = syntheticPores(384, 384, 0.05 + i * 0.04, 300 + i);
    p.push(Math.abs(analysePorosity(flattenBackground(b.image)).porosity - b.truth.porosity) * 100);
  }
  console.log(`clean images after flattening: grains ${(mean(g) * 100).toFixed(1)}%, porosity ${mean(p).toFixed(2)} pp`);
  assert.ok(Math.max(...g) < 0.06 && Math.max(...p) < 1.5);
});
