import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { MaterialsExplorer } from "./materials-explorer";

export const metadata: Metadata = { title: "Materials Explorer" };

export default function MaterialsPage() {
  return (
    <>
      <PageHeader
        title="Materials Explorer"
        description="Search computed properties of materials in the Materials Project database — semiconductors by band gap, elastic moduli, magnetism, dielectric and piezoelectric response, and surfaces."
      />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <MaterialsExplorer />
      </Suspense>
      <ToolAbout
        term="the Materials Explorer"
        definition={"The Materials Explorer searches the Materials Project, an open database of more than 150,000 inorganic materials whose properties were calculated with density functional theory (DFT). You can filter by element and by property — band gap, elastic moduli, magnetism, dielectric and piezoelectric response, or surface energy — and open any result for its crystal structure, simulated X-ray diffraction pattern, band structure and more."}
        steps={[
          "Choose a property set (for example Semiconductors).",
          "Name elements to include or exclude, tick “stable only” if you want thermodynamically stable phases, and set ranges for the properties.",
          "Press Search, then open a material for its full page, 3D structure, XRD pattern, band structure and a downloadable PDF report."
        ]}
        how={"Each search is sent to the Materials Project API through this site’s server (which holds the API key) and the answer is cached for an hour. The material page computes the XRD pattern in your browser from the calculated structure, using the same method as pymatgen."}
        limits={[
          "Values are DFT calculations at zero kelvin, not measurements. Band gaps are typically underestimated, and lattice parameters from the PBE functional are typically 1–2 % too large.",
          "Magnetic ordering, elastic constants and surface properties exist for only part of the database."
        ]}
        sources={[
          { label: "Materials Project — Jain et al., APL Materials 1, 011002 (2013), CC BY 4.0", href: "https://doi.org/10.1063/1.4812323" }
        ]}
      />
    </>
  );
}
