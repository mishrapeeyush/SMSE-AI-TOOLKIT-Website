import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";

import { XrdMatcher } from "./xrd-matcher";

export const metadata: Metadata = { title: "XRD Phase Matching" };

export default function XrdMatchPage() {
  return (
    <>
      <PageHeader
        title="XRD Phase Matching"
        description="Upload a measured powder diffraction pattern, name the elements that may be in the sample, and find which Materials Project phases explain it. Peak widths give crystallite sizes (Scherrer). Your file is analysed in the browser and never uploaded."
      />
      <XrdMatcher />
    </>
  );
}
