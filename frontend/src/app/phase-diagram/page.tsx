import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { PhaseDiagram } from "./phase-diagram";

export const metadata: Metadata = { title: "Phase Diagram" };

export default function PhaseDiagramPage() {
  return (
    <>
      <PageHeader
        title="Phase Diagram"
        description="Formation-energy convex hulls for two- or three-element systems: which compounds are thermodynamically stable, which phases coexist (tie-lines), and how far the others sit above the hull. Data from the Materials Project."
      />
      <PhaseDiagram />
      <ToolAbout
        term="a formation-energy convex hull"
        definition={"The formation energy of a compound is the energy released when it forms from its elements. Plotted against composition, the lowest points form a convex hull: compounds on the hull are thermodynamically stable (at 0 K), those above it can lower their energy by splitting into the hull phases they sit between, and the distance above the hull (energy above hull) measures how unstable they are. Lines joining neighbouring hull points are tie-lines — they show which phases can coexist."}
        steps={[
          "Enter two elements for a binary diagram or three for a ternary one, then press Compute hull.",
          "Read the stable compounds in the list; click any point to open that material.",
          "Use the slider to show less stable phases up to a chosen energy above hull."
        ]}
        how={"Formation energies and the stable/unstable classification come from the Materials Project, which computed the hull over its full database. For ternary systems the tie-lines are computed in your browser as the lower convex hull of the stable phases."}
        limits={[
          "It is a zero-kelvin picture of calculated energies. It does not show temperature effects, kinetics or metastable phases that form in practice, and it cannot show a phase that is missing from the database.",
          "Systems that include other elements may have additional stable phases that this two- or three-element view leaves out."
        ]}
        sources={[
          { label: "Materials Project — Jain et al., APL Materials 1, 011002 (2013)", href: "https://doi.org/10.1063/1.4812323" }
        ]}
      />
    </>
  );
}
