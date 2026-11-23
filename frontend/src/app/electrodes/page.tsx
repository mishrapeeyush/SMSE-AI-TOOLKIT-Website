import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { ElectrodeExplorer } from "./electrode-explorer";

export const metadata: Metadata = { title: "Battery Electrodes" };

export default function ElectrodesPage() {
  return (
    <>
      <PageHeader
        title="Battery Electrodes"
        description="Search calculated insertion electrodes for Li, Na, K, Mg, Ca, Zn and Al batteries by voltage, capacity, energy density, volume change and stability — with voltage profiles."
      />
      <ElectrodeExplorer />
      <ToolAbout
        term="a battery insertion electrode"
        definition={"In an insertion (intercalation) electrode a working ion — lithium, sodium, magnesium and so on — moves into and out of a host crystal during discharge and charge. The average voltage, the gravimetric and volumetric capacity, the specific energy, the change in cell volume and the stability of the charged and discharged phases tell you how good a candidate it might be."}
        steps={[
          "Choose the working ion and, optionally, elements the host must contain.",
          "Set ranges for voltage, capacity, energy, volume change and stability, and press Search.",
          "Open a row to see its voltage profile (voltage against cumulative capacity)."
        ]}
        how={"The candidates are the insertion-electrode entries of the Materials Project, computed with DFT from pairs of charged and discharged structures along the convex hull. Voltages come from the energy difference between those structures."}
        limits={[
          "Calculated voltages and capacities are theoretical: they ignore electrolyte decomposition, kinetics, side reactions and cycling degradation.",
          "A small volume change and a low energy above hull in the discharged state are good signs, but neither guarantees a working cell."
        ]}
        sources={[
          { label: "Materials Project battery explorer — Jain et al., APL Materials 1, 011002 (2013)", href: "https://doi.org/10.1063/1.4812323" }
        ]}
      />
    </>
  );
}
