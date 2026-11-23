"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { Badge, Button, Card, CardTitle, Input, Label, Notice } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { mergeNearbyPeaks, WAVELENGTHS, type Radiation, type XrdPeak, type XrdStructure } from "@/lib/xrd";
import { findPeaks, identifyPhases, parseXrdFile, scherrerSize, type Candidate, type ExpPeak, type Match, type Pattern } from "@/lib/xrd-match";
import type { XrdBatchRequest, XrdResponse } from "@/lib/xrd.worker";

type CandidateMeta = { material_id: string; formula: string; spacegroup: string | null; e_above_hull: number | null; is_stable: boolean; structure: XrdStructure };
type CandidatesResponse = { elements: string[]; total: number; candidates: CandidateMeta[] };
type Outcome = { identified: Match[]; ranked: Match[]; meta: Map<string, CandidateMeta>; tried: number; skipped: number; elements: string[] };

const W = 820;
const M = { top: 16, right: 16, bottom: 36, left: 52 };
const PW = W - M.left - M.right;
const PH = 260;
const ROW = 24; // height of one reference-tick row below the pattern
const COLORS = ["#1c7ed6", "#e8590c", "#0ca678", "#9c36b5", "#f59f00", "#e64980"];

function computeBatch(structures: XrdStructure[], wavelength: number, range: [number, number]): Promise<(XrdPeak[] | null)[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../lib/xrd.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<XrdResponse>) => {
      worker.terminate();
      if ("batch" in e.data) resolve(e.data.batch);
      else reject(new Error("error" in e.data ? e.data.error : "Unexpected worker reply."));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("The diffraction calculation failed in this browser."));
    };
    worker.postMessage({ structures, wavelength, range } satisfies XrdBatchRequest);
  });
}

/** Max-pool to at most `bins` points so a 10 000-point scan draws quickly without losing peak tops. */
function downsample(p: Pattern, bins = 900) {
  const n = p.twoTheta.length;
  if (n <= bins) return p.twoTheta.map((x, i) => [x, p.intensity[i]] as const);
  const out: (readonly [number, number])[] = [];
  const size = n / bins;
  for (let b = 0; b < bins; b++) {
    let best = -1;
    for (let i = Math.floor(b * size); i < Math.min(n, Math.floor((b + 1) * size)); i++) if (best < 0 || p.intensity[i] > p.intensity[best]) best = i;
    if (best >= 0) out.push([p.twoTheta[best], p.intensity[best]] as const);
  }
  return out;
}

export function XrdMatcher() {
  const [file, setFile] = useState<{ name: string; pattern: Pattern } | null>(null);
  const [elements, setElements] = useState("");
  const [radiation, setRadiation] = useState<Radiation>("CuKa");
  const [instrumental, setInstrumental] = useState("0.05");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showWeak, setShowWeak] = useState(false);
  const run = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const peaks: ExpPeak[] = useMemo(() => (file ? findPeaks(file.pattern.twoTheta, file.pattern.intensity) : []), [file]);
  const range = useMemo<[number, number] | null>(() => (file ? [file.pattern.twoTheta[0], file.pattern.twoTheta[file.pattern.twoTheta.length - 1]] : null), [file]);

  const load = (name: string, text: string, suggestElements?: string) => {
    try {
      const pattern = parseXrdFile(text);
      setFile({ name, pattern });
      setOutcome(null);
      setError(null);
      if (suggestElements) setElements(suggestElements);
    } catch (e) {
      setFile(null);
      setError((e as Error).message);
    }
  };

  const onFile = async (f: File) => {
    if (f.size > 20_000_000) return setError("That file is larger than 20 MB — is it a text pattern (2θ, intensity)?");
    load(f.name, await f.text());
  };

  const loadDemo = async () => {
    const res = await fetch("/samples/xrd-demo-Fe-Si.xy");
    load("xrd-demo-Fe-Si.xy (synthetic)", await res.text(), "Fe Si");
  };

  const identify = async () => {
    if (!file || !range) return;
    const id = ++run.current;
    setError(null);
    setOutcome(null);
    try {
      if (peaks.length < 3) throw new Error("Fewer than three peaks were found in this pattern — check that the columns are 2θ (degrees) and intensity.");
      setBusy("Fetching candidate phases from the Materials Project…");
      const res = await apiGet<CandidatesResponse>("/xrd/candidates", { elements: elements.trim().replace(/[,\s]+/g, ",") });
      if (id !== run.current) return;
      if (!res.candidates.length) throw new Error(`No near-stable phases were found for ${res.elements.join("–")}.`);
      setBusy(`Simulating ${res.candidates.length} diffraction patterns…`);
      const sims = await computeBatch(res.candidates.map((c) => c.structure), WAVELENGTHS[radiation], [Math.max(1, range[0] - 2), Math.min(150, range[1] + 2)]);
      if (id !== run.current) return;
      const meta = new Map(res.candidates.map((c) => [c.material_id, c]));
      const cands: Candidate[] = [];
      sims.forEach((s, i) => {
        if (s && s.length) cands.push({ id: res.candidates[i].material_id, formula: res.candidates[i].formula, peaks: mergeNearbyPeaks(s) });
      });
      setBusy("Matching…");
      await new Promise((r) => setTimeout(r, 0)); // let the status text paint before the (synchronous) matching
      const { identified, ranked } = identifyPhases(peaks, cands, range);
      setOutcome({ identified, ranked, meta, tried: cands.length, skipped: res.candidates.length - cands.length, elements: res.elements });
    } catch (e) {
      if (id === run.current) setError((e as Error).message);
    } finally {
      if (id === run.current) setBusy(null);
    }
  };

  // ---- plot geometry
  const plot = useMemo(() => {
    if (!file || !range) return null;
    const pts = downsample(file.pattern);
    const top = Math.max(...pts.map((p) => p[1]), 1);
    const bottom = Math.min(...pts.map((p) => p[1]), 0);
    return { pts, top, bottom };
  }, [file, range]);

  const rows = outcome?.identified ?? [];
  const H = M.top + PH + M.bottom + rows.length * ROW;
  const x = (t: number) => (range ? M.left + ((t - range[0]) / (range[1] - range[0])) * PW : 0);
  const y = (v: number) => (plot ? M.top + PH - ((v - plot.bottom) / (plot.top - plot.bottom || 1)) * PH : 0);
  const lambda = WAVELENGTHS[radiation];
  const instr = Number(instrumental.replace(",", ".")) || 0;

  const scherrerRows = useMemo(
    () =>
      [...peaks]
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 8)
        .sort((a, b) => a.twoTheta - b.twoTheta)
        .map((p) => ({
          ...p,
          d: lambda / (2 * Math.sin((p.twoTheta / 2) * (Math.PI / 180))),
          size: scherrerSize(p.fwhm, p.twoTheta, lambda, { instrumentalFwhm: instr }),
        })),
    [peaks, lambda, instr],
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label htmlFor="xrd-file" hint="2θ and intensity columns (.xy .dat .csv .xye .txt)">
              Measured pattern
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => input.current?.click()}>
                <FileUp className="size-4" aria-hidden /> Open file
              </Button>
              <input id="xrd-file" ref={input} type="file" accept=".xy,.xye,.dat,.csv,.txt,.asc,text/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <Button variant="ghost" onClick={loadDemo}>
                Synthetic example
              </Button>
            </div>
            {file && range && (
              <p className="mt-2 text-xs text-muted">
                {file.name} · {file.pattern.twoTheta.length.toLocaleString()} points · {range[0].toFixed(1)}–{range[1].toFixed(1)}° · {peaks.length} peaks found
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="xrd-elements" hint="up to 4, e.g. Fe Si">
              Elements possibly present
            </Label>
            <Input id="xrd-elements" value={elements} onChange={(e) => setElements(e.target.value)} placeholder="Fe O" className="font-mono" />
            <div className="mt-3 flex items-center gap-2">
              <Label htmlFor="xrd-source">X-ray source</Label>
              <select id="xrd-source" value={radiation} onChange={(e) => setRadiation(e.target.value as Radiation)} className="rounded-lg border border-line bg-surface px-2 py-1 text-sm">
                {Object.keys(WAVELENGTHS).map((r) => (
                  <option key={r} value={r}>
                    {r.replace("Ka", " Kα")} ({WAVELENGTHS[r as Radiation]} Å)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={identify} loading={busy !== null} disabled={!file || !elements.trim()}>
              Identify phases
            </Button>
          </div>
        </div>
        {busy && (
          <p className="mt-3 text-sm text-muted" role="status">
            {busy}
          </p>
        )}
      </Card>

      {error && <Notice>{error}</Notice>}
      {!file && !error && (
        <p className="text-muted">
          Open a pattern, or try the synthetic Fe + Si example (it needs the Materials Project, like all candidate lookups). Wavelength must match the instrument that measured it.
        </p>
      )}

      {file && plot && range && (
        <Card>
          <CardTitle aside={outcome && <Badge>{outcome.tried} candidates compared</Badge>}>Pattern</CardTitle>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-xl" role="img" aria-label="Measured diffraction pattern with detected peaks and matched reference lines">
              <line x1={M.left} x2={W - M.right} y1={M.top + PH} y2={M.top + PH} stroke="var(--line)" />
              <polyline fill="none" stroke="var(--fg)" strokeWidth="1" points={plot.pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
              {peaks.map((p, i) => (
                <circle key={i} cx={x(p.twoTheta)} cy={M.top + 4} r="2.5" fill="var(--accent)">
                  <title>{`${p.twoTheta.toFixed(2)}°  FWHM ${p.fwhm.toFixed(3)}°`}</title>
                </circle>
              ))}
              {Array.from({ length: Math.floor((range[1] - range[0]) / 10) + 1 }, (_, i) => Math.ceil(range[0] / 10) * 10 + i * 10)
                .filter((t) => t <= range[1])
                .map((t) => (
                  <g key={t}>
                    <line x1={x(t)} x2={x(t)} y1={M.top + PH} y2={M.top + PH + 4} stroke="var(--muted)" />
                    <text x={x(t)} y={M.top + PH + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
                      {t}
                    </text>
                  </g>
                ))}
              <text x={M.left + PW / 2} y={M.top + PH + 30} textAnchor="middle" fontSize="11" fill="var(--muted)">
                2θ (degrees)
              </text>
              {rows.map((m, r) => {
                const color = COLORS[r % COLORS.length];
                const base = M.top + PH + M.bottom - 4 + r * ROW + ROW - 2;
                const tick = (p: XrdPeak, solid: boolean) => {
                  const t = p.twoTheta + m.shift;
                  return t >= range[0] && t <= range[1] ? (
                    <line key={`${p.twoTheta}-${solid}`} x1={x(t)} x2={x(t)} y1={base} y2={base - (6 + (p.intensity / 100) * (ROW - 8))} stroke={color} strokeWidth="1.5" opacity={solid ? 1 : 0.35} strokeDasharray={solid ? undefined : "2 2"} />
                  ) : null;
                };
                return (
                  <g key={m.id}>
                    {m.matched.map((q) => tick(q.sim, true))}
                    {m.missing.map((p) => tick(p, false))}
                    <text x={M.left - 6} y={base} textAnchor="end" fontSize="10" fill={color}>
                      {m.formula}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {outcome && <p className="mt-1 text-xs text-muted">Coloured ticks: simulated lines of each identified phase (solid = found in the data, faint dashed = expected but missing). Dots on top: detected peaks.</p>}
        </Card>
      )}

      {outcome && (
        <Card>
          <CardTitle>Identified phases</CardTitle>
          {outcome.identified.length === 0 ? (
            <p className="text-sm text-muted">
              No phase of {outcome.elements.join("–")} explains this pattern well enough. Check the elements and X-ray source, or look at the weaker candidates below — an
              unlisted element, a phase with a large unit cell, or an amorphous sample would all look like this.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-176 text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Phase</th>
                    <th className="py-2 pr-4 font-medium">Space group</th>
                    <th className="py-2 pr-4 font-medium">Match score</th>
                    <th className="py-2 pr-4 font-medium">Lines found</th>
                    <th className="py-2 pr-4 font-medium" title="(a_database − a_measured)/a_measured; DFT lattices are typically 1–2 % too large">
                      Lattice vs database
                    </th>
                    <th className="py-2 pr-4 font-medium">Zero shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {outcome.identified.map((m, r) => {
                    const c = outcome.meta.get(m.id)!;
                    return (
                      <tr key={m.id}>
                        <td className="py-2 pr-4">
                          <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: COLORS[r % COLORS.length] }} aria-hidden />
                          <Link href={`/materials/${m.id}`} className="font-medium hover:text-accent">
                            {m.formula}
                          </Link>{" "}
                          <span className="font-mono text-xs text-muted">{m.id}</span>
                        </td>
                        <td className="py-2 pr-4">{c.spacegroup ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono tabular-nums">{(m.score * 100).toFixed(0)} %</td>
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {m.matched.length} / {m.matched.length + m.missing.length}
                        </td>
                        <td className="py-2 pr-4 font-mono tabular-nums">{`${m.strain >= 0 ? "+" : ""}${(m.strain * 100).toFixed(2)} %`}</td>
                        <td className="py-2 pr-4 font-mono tabular-nums">{`${m.shift >= 0 ? "+" : ""}${m.shift.toFixed(2)}°`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            The score rewards finding every expected line of a phase at its position (allowing a lattice-scale and zero-shift correction, which absorb DFT lattice error and sample
            displacement). A phase is listed only if it explains peaks no better-matching phase has already claimed. It does not use line intensities strongly, so preferred
            orientation does not hurt, but it also cannot tell apart polymorphs with near-identical lines. Treat it as a shortlist to confirm, not a certificate.
          </p>
          {outcome.skipped > 0 && <p className="mt-1 text-xs text-muted">{outcome.skipped} candidate structure(s) were skipped (too large to simulate in the browser).</p>}

          <button type="button" className="mt-4 text-sm text-accent hover:underline" onClick={() => setShowWeak((s) => !s)} aria-expanded={showWeak}>
            {showWeak ? "Hide" : "Show"} other candidates (weaker evidence)
          </button>
          {showWeak && (
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {outcome.ranked
                .filter((m) => !outcome.identified.includes(m))
                .slice(0, 10)
                .map((m) => (
                  <li key={m.id} className="flex justify-between gap-4 border-b border-line py-1">
                    <Link href={`/materials/${m.id}`} className="hover:text-accent">
                      {m.formula} <span className="font-mono text-xs text-muted">{outcome.meta.get(m.id)?.spacegroup}</span>
                    </Link>
                    <span className="font-mono tabular-nums text-muted">{(m.score * 100).toFixed(0)} %</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      )}

      {file && peaks.length > 0 && (
        <Card>
          <CardTitle>Peaks and crystallite size (Scherrer)</CardTitle>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Label htmlFor="instr" hint="°">
                Instrumental FWHM
              </Label>
              <Input id="instr" inputMode="decimal" value={instrumental} onChange={(e) => setInstrumental(e.target.value)} className="font-mono" />
            </div>
            <p className="max-w-xl text-xs text-muted">
              Use the width of a standard (e.g. LaB₆ or Si) measured on the same instrument; it is removed in quadrature. With 0 the size is a lower bound. Scherrer (K = 0.9) is
              meaningful up to roughly 100–200 nm and ignores strain broadening.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-136 text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">2θ (°)</th>
                  <th className="py-2 pr-4 font-medium">d (Å)</th>
                  <th className="py-2 pr-4 font-medium">Rel. intensity</th>
                  <th className="py-2 pr-4 font-medium">FWHM (°)</th>
                  <th className="py-2 pr-4 font-medium">Crystallite size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono tabular-nums">
                {scherrerRows.map((p) => (
                  <tr key={p.twoTheta}>
                    <td className="py-2 pr-4">{p.twoTheta.toFixed(2)}</td>
                    <td className="py-2 pr-4">{p.d.toFixed(4)}</td>
                    <td className="py-2 pr-4">{p.intensity.toFixed(0)}</td>
                    <td className="py-2 pr-4">{p.fwhm.toFixed(3)}</td>
                    <td className="py-2 pr-4">{p.size === null ? "narrower than instrument" : p.size > 200 ? `> 200 nm (${p.size.toFixed(0)})` : `${p.size.toFixed(1)} nm`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
