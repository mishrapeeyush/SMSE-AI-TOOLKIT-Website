/// <reference lib="webworker" />
// Runs the XRD simulation off the main thread so large unit cells cannot freeze the page.
import { computeXrd, type XrdPeak, type XrdStructure } from "./xrd";

export type XrdRequest = { structure: XrdStructure; wavelength: number; range: [number, number] };
export type XrdResponse = { peaks: XrdPeak[] } | { error: string };

self.onmessage = (e: MessageEvent<XrdRequest>) => {
  try {
    const { structure, wavelength, range } = e.data;
    (self as unknown as Worker).postMessage({ peaks: computeXrd(structure, wavelength, range) } satisfies XrdResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: (err as Error).message } satisfies XrdResponse);
  }
};
