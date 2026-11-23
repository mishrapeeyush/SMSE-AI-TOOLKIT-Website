/**
 * Experimental powder-XRD analysis: file parsing, peak finding, phase matching against simulated patterns
 * (see xrd.ts) and Scherrer crystallite size. Pure functions, tested in tests/xrd-match.test.ts against
 * synthetic patterns with known phases, shift, broadening and noise.
 */
import type { XrdPeak } from "./xrd";

export type Pattern = { twoTheta: number[]; intensity: number[] };
export type ExpPeak = { twoTheta: number; /** relative to the strongest line, 0–100 */ intensity: number; fwhm: number };

// ---------------------------------------------------------------- parsing

/** Read a two-column (2θ, counts) text file: .xy / .dat / .csv / .xye / semicolon with decimal commas. */
export function parseXrdFile(text: string): Pattern {
  const x: number[] = [];
  const y: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^[#;/!*]/.test(line) && !/^[;]?\s*[-+\d.]/.test(line)) continue;
    // "20,5;100,2" (semicolon-separated, decimal comma) vs "20.5,100.2" / "20.5 100.2" / tabs
    const cells = line.includes(";") ? line.split(";").map((c) => c.trim().replace(",", ".")) : line.split(/[\s,]+/);
    const a = Number(cells[0]);
    const b = Number(cells[1]);
    if (cells.length >= 2 && cells[0] !== "" && cells[1] !== "" && Number.isFinite(a) && Number.isFinite(b)) {
      x.push(a);
      y.push(b);
    }
  }
  if (x.length === 0) throw new Error("Could not find two numeric columns (2θ and intensity) in this file.");
  if (x.length < 10) throw new Error(`Found only ${x.length} data points; a diffraction pattern needs at least 10.`);
  const order = x.map((_, i) => i).sort((i, j) => x[i] - x[j]);
  return { twoTheta: order.map((i) => x[i]), intensity: order.map((i) => y[i]) };
}

// ---------------------------------------------------------------- peak finding

function movingAverage(v: number[], half: number): number[] {
  const out = new Array<number>(v.length);
  const prefix = [0];
  for (const a of v) prefix.push(prefix[prefix.length - 1] + a);
  for (let i = 0; i < v.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(v.length - 1, i + half);
    out[i] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
  }
  return out;
}

/** 5-point Savitzky–Golay (quadratic): smooths noise while keeping peak height and width. */
function savgol5(v: number[]): number[] {
  const c = [-3, 12, 17, 12, -3];
  return v.map((_, i) => {
    if (i < 2 || i > v.length - 3) return v[i];
    let s = 0;
    for (let k = -2; k <= 2; k++) s += c[k + 2] * v[i + k];
    return s / 35;
  });
}

/** Rolling minimum over `half` points each side. */
function rollingMin(v: number[], half: number): number[] {
  return v.map((_, i) => {
    let m = Infinity;
    for (let k = Math.max(0, i - half); k <= Math.min(v.length - 1, i + half); k++) if (v[k] < m) m = v[k];
    return m;
  });
}

/**
 * Peaks of a measured pattern: smoothed, background-subtracted local maxima above `minRelative` of the
 * strongest line (and above the noise), with parabolic position refinement and half-maximum width.
 */
export function findPeaks(twoTheta: number[], counts: number[], opts: { minRelative?: number } = {}): ExpPeak[] {
  const n = twoTheta.length;
  if (n < 20) return [];
  const minRelative = opts.minRelative ?? 0.03;
  const step = (twoTheta[n - 1] - twoTheta[0]) / (n - 1);
  if (!(step > 0)) return [];

  const smooth = savgol5(counts);
  // Background: rolling minimum over ~3° (wider than any peak), smoothed — then subtracted.
  const win = Math.max(5, Math.round(1.5 / step));
  const bg = movingAverage(rollingMin(smooth, win), Math.max(2, Math.round(win / 2)));
  const s = smooth.map((v, i) => v - bg[i]);

  const resid = counts.map((v, i) => Math.abs(v - smooth[i])).sort((a, b) => a - b);
  const noise = 1.4826 * resid[Math.floor(resid.length / 2)];
  const top = Math.max(...s);
  if (!(top > 0)) return [];
  const floor = Math.max(minRelative * top, 4 * noise);

  const peaks: ExpPeak[] = [];
  for (let i = 2; i < n - 2; i++) {
    if (!(s[i] > floor && s[i] > s[i - 1] && s[i] >= s[i + 1])) continue;
    // Parabolic interpolation through the top three points.
    const a = s[i - 1];
    const b = s[i];
    const c = s[i + 1];
    const denom = a - 2 * b + c;
    const off = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    const height = b - 0.25 * (a - c) * off;
    // Half-maximum crossings (linear interpolation), stopping at the next valley.
    const half = height / 2;
    let l = i;
    while (l > 0 && s[l] > half && (l === i || s[l] <= s[l + 1] + noise)) l--;
    let r = i;
    while (r < n - 1 && s[r] > half && (r === i || s[r] <= s[r - 1] + noise)) r++;
    const xl = l < i && s[l] <= half ? twoTheta[l] + ((half - s[l]) / (s[l + 1] - s[l])) * step : twoTheta[l];
    const xr = r > i && s[r] <= half ? twoTheta[r] - ((half - s[r]) / (s[r - 1] - s[r])) * step : twoTheta[r];
    peaks.push({ twoTheta: twoTheta[i] + off * step, intensity: height, fwhm: Math.max(step, xr - xl) });
  }
  // Drop a peak that is a shoulder/ripple of a stronger neighbour within half a peak width.
  const kept = peaks.filter((p, i) => !peaks.some((q, j) => j !== i && q.intensity > p.intensity && Math.abs(q.twoTheta - p.twoTheta) < 0.5 * Math.max(q.fwhm, p.fwhm)));
  const maxH = Math.max(...kept.map((p) => p.intensity), 1);
  return kept.map((p) => ({ ...p, intensity: (p.intensity / maxH) * 100 }));
}

// ---------------------------------------------------------------- phase matching

export type Candidate = { id: string; formula: string; peaks: XrdPeak[] };
export type Match = {
  id: string;
  formula: string;
  /** 0–1 figure of merit (see below) */
  score: number;
  /** fraction of the phase's expected line intensity found in the data */
  coverage: number;
  /** fraction of the measured line intensity explained by this phase */
  explained: number;
  /** best global 2θ offset of the simulated lines (sample displacement / zero error), degrees */
  shift: number;
  /** best lattice scale: (a_candidate − a_sample) / a_sample. DFT (PBE) lattices are typically 1–2 % too large. */
  strain: number;
  matched: { sim: XrdPeak; exp: ExpPeak }[];
  missing: XrdPeak[];
};

const TOL = 0.25; // degrees: a line counts as matched when within this of the (shifted) simulated line
const SHIFT = 0.3; // degrees: largest global offset tried
const STRAIN = 0.03; // largest lattice-scale mismatch tried (±3 %), step 0.25 %
const STRAIN_STEP = 0.0025;
const MIN_SIM = 3; // % — weaker simulated lines are not required to be seen
const STRONG = 50; // % — a missing line this strong is strong evidence against the phase

/**
 * Compare one simulated pattern to measured peaks. The score is dominated by *coverage* (is every expected
 * line there?) because a mixture explains only part of the data, and is capped when a strong line is absent.
 */
function scorePositions(exp: ExpPeak[], expTotal: number, sim: XrdPeak[], shift: number, range: [number, number], cand: Candidate, strain: number): Match {
  const inRange = sim.filter((p) => p.intensity >= MIN_SIM && p.twoTheta + shift >= range[0] + TOL && p.twoTheta + shift <= range[1] - TOL);
  const used = new Set<number>();
  const matched: Match["matched"] = [];
  const weight = new Map<XrdPeak, number>();
  const missing: XrdPeak[] = [];
  for (const p of [...inRange].sort((a, b) => b.intensity - a.intensity)) {
    let bi = -1;
    let bd = TOL;
    exp.forEach((e, i) => {
      const d = Math.abs(e.twoTheta - (p.twoTheta + shift));
      if (!used.has(i) && d <= bd) {
        bd = d;
        bi = i;
      }
    });
    // Closer is better: a line dead on position counts fully, one at the tolerance edge counts nothing.
    if (bi >= 0) {
      used.add(bi);
      matched.push({ sim: p, exp: exp[bi] });
      weight.set(p, 1 - (bd / TOL) ** 2);
    } else missing.push(p);
  }
  const simTotal = inRange.reduce((a, p) => a + p.intensity, 0);
  const coverage = simTotal ? matched.reduce((a, m) => a + m.sim.intensity * weight.get(m.sim)!, 0) / simTotal : 0;
  const explained = expTotal ? matched.reduce((a, m) => a + m.exp.intensity * weight.get(m.sim)!, 0) / expTotal : 0;
  let score = matched.length ? coverage * (0.75 + 0.25 * explained) * (1 - 2 * Math.abs(strain)) : 0;
  if (missing.some((p) => p.intensity >= STRONG)) score *= 0.5;
  return { id: cand.id, formula: cand.formula, score, coverage, explained, shift, strain, matched, missing };
}

/** Simulated lines closer than this cannot be told apart in a measured pattern (typical FWHM ≈ 0.1–0.4°). */
const RESOLUTION = 0.12;

/** Blend lines within RESOLUTION into one at their intensity-weighted centroid (symmetry-split lines of slightly distorted cells). */
function resolveLines(peaks: XrdPeak[]): XrdPeak[] {
  const out: (XrdPeak & { first: number })[] = [];
  for (const p of [...peaks].sort((a, b) => a.twoTheta - b.twoTheta)) {
    const last = out[out.length - 1];
    if (last && p.twoTheta - last.first < RESOLUTION) {
      last.twoTheta = (last.twoTheta * last.intensity + p.twoTheta * p.intensity) / (last.intensity + p.intensity);
      if (p.intensity > last.intensity) last.hkl = p.hkl;
      last.intensity += p.intensity;
      last.multiplicity += p.multiplicity;
    } else out.push({ ...p, first: p.twoTheta });
  }
  return out;
}

export function matchPhase(exp: ExpPeak[], cand: Candidate, range: [number, number]): Match {
  const lines = resolveLines(cand.peaks);
  const top = Math.max(...lines.map((p) => p.intensity), 1e-9);
  const sim = lines.map((p) => ({ ...p, intensity: (p.intensity / top) * 100 }));
  const expTotal = exp.reduce((a, p) => a + p.intensity, 0);
  let best: Match | null = null;
  for (let e = -Math.round(STRAIN / STRAIN_STEP); e <= Math.round(STRAIN / STRAIN_STEP); e++) {
    const strain = e * STRAIN_STEP;
    // Lattice scale changes every d-spacing: sin θ_sample = (1 + strain)·sin θ_candidate.
    const scaled = sim.flatMap((p) => {
      const sinT = Math.sin((p.twoTheta / 2) * (Math.PI / 180)) * (1 + strain);
      return sinT < 1 ? [{ ...p, twoTheta: (2 * Math.asin(sinT)) / (Math.PI / 180) }] : [];
    });
    for (let k = -Math.round(SHIFT / 0.02); k <= Math.round(SHIFT / 0.02); k++) {
      const cur = scorePositions(exp, expTotal, scaled, k * 0.02, range, cand, strain);
      const better =
        !best || cur.score > best.score + 1e-9 || (Math.abs(cur.score - best.score) <= 1e-9 && Math.abs(cur.shift) + Math.abs(cur.strain) * 100 < Math.abs(best.shift) + Math.abs(best.strain) * 100);
      if (better) best = cur;
    }
  }
  return best ?? { id: cand.id, formula: cand.formula, score: 0, coverage: 0, explained: 0, shift: 0, strain: 0, matched: [], missing: [] };
}

/** `range` is the 2θ span of the measured pattern: simulated lines outside it cannot be expected in the data. */
export function rankCandidates(exp: ExpPeak[], candidates: Candidate[], range: [number, number]): Match[] {
  if (!exp.length) return candidates.map((c) => ({ id: c.id, formula: c.formula, score: 0, coverage: 0, explained: 0, shift: 0, strain: 0, matched: [], missing: [] }));
  return candidates.map((c) => matchPhase(exp, c, range)).sort((a, b) => b.score - a.score);
}

/**
 * Greedy phase identification. Independent scores alone are not enough: with a lattice-scale and zero-shift
 * freedom, a phase with a handful of lines can land on a dense pattern by chance. So the best phase is
 * accepted first and its measured peaks are *claimed*; each further phase must explain peaks nobody has
 * claimed (a line shared with an accepted phase is allowed, but cannot be the phase's only evidence).
 */
export function identifyPhases(
  exp: ExpPeak[],
  candidates: Candidate[],
  range: [number, number],
  opts: { minScore?: number; maxPhases?: number } = {},
): { identified: Match[]; ranked: Match[] } {
  const { minScore = 0.6, maxPhases = 6 } = opts;
  const ranked = rankCandidates(exp, candidates, range);
  const claimed = new Set<ExpPeak>();
  const identified: Match[] = [];
  let pool = ranked;
  while (identified.length < maxPhases) {
    const best = pool.find((m) => {
      const unique = m.matched.filter((x) => !claimed.has(x.exp)).length;
      const lines = m.matched.length + m.missing.length;
      return m.score >= minScore && unique >= Math.min(3, lines) && unique >= 0.5 * m.matched.length;
    });
    if (!best) break;
    identified.push(best);
    best.matched.forEach((x) => claimed.add(x.exp));
    pool = pool.filter((m) => m !== best);
  }
  return { identified, ranked };
}

// ---------------------------------------------------------------- crystallite size

/**
 * Scherrer equation, L = K·λ / (β·cos θ), in nm. β is the sample broadening: the measured FWHM with the
 * instrumental FWHM removed in quadrature. Returns null when the line is not broader than the instrument.
 */
export function scherrerSize(
  fwhmDeg: number,
  twoThetaDeg: number,
  wavelengthA: number,
  opts: { K?: number; instrumentalFwhm?: number } = {},
): number | null {
  const { K = 0.9, instrumentalFwhm = 0 } = opts;
  const b2 = fwhmDeg ** 2 - instrumentalFwhm ** 2;
  if (!(b2 > 0)) return null;
  const beta = (Math.sqrt(b2) * Math.PI) / 180;
  const theta = ((twoThetaDeg / 2) * Math.PI) / 180;
  return (K * wavelengthA) / (beta * Math.cos(theta)) / 10;
}
