/// <reference lib="webworker" />
// Runs the XRD simulation off the main thread so large unit cells cannot freeze the page.
import { computeXrd, MAX_XRD_COST, xrdCost, type XrdPeak, type XrdStructure } from "./xrd";

export type XrdRequest = { structure: XrdStructure; wavelength: number; range: [number, number] };
/** Several structures at once (phase matching): structures that fail or are too large come back as null. */
export type XrdBatchRequest = { structures: XrdStructure[]; wavelength: number; range: [number, number] };
export type XrdResponse = { peaks: XrdPeak[] } | { batch: (XrdPeak[] | null)[] } | { error: string };

self.onmessage = (e: MessageEvent<XrdRequest | XrdBatchRequest>) => {
  try {
    if ("structures" in e.data) {
      const { structures, wavelength, range } = e.data;
      const batch = structures.map((st) => {
        if (xrdCost(st, wavelength, range) > MAX_XRD_COST / 10) return null; // keep one candidate from dominating the run
        try {
          return computeXrd(st, wavelength, range);
        } catch {
          return null; // e.g. an element without scattering coefficients
        }
      });
      (self as unknown as Worker).postMessage({ batch } satisfies XrdResponse);
      return;
    }
    const { structure, wavelength, range } = e.data;
    (self as unknown as Worker).postMessage({ peaks: computeXrd(structure, wavelength, range) } satisfies XrdResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: (err as Error).message } satisfies XrdResponse);
  }
};
