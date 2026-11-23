import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

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
      <ToolAbout
        term="XRD phase matching"
        definition={"In powder X-ray diffraction (XRD), X-rays scatter from the planes of atoms in a crystalline sample and give a pattern of peaks at angles 2θ set by the spacings between those planes (Bragg’s law). Every crystalline phase has its own pattern, like a fingerprint, so comparing a measured pattern with calculated ones identifies which phases are present. The width of a peak carries information too: very small crystallites broaden it, and the Scherrer equation turns that broadening into a crystallite size."}
        steps={[
          "Upload a pattern as a text file with 2θ (degrees) and intensity columns, or drop it on the card.",
          "Type the elements the sample might contain (up to four) and select the X-ray source your instrument used.",
          "Press Identify phases. Each listed phase shows how many of its expected lines were found, a lattice offset and a zero shift.",
          "Enter your instrument’s own peak width to get crystallite sizes from the peak table."
        ]}
        how={"Peaks are found after smoothing and removing the background. Candidate phases from the Materials Project are simulated in your browser, and each is compared line by line with the measured peaks while allowing for a small lattice-scale error (DFT lattices are typically 1–2 % too large) and a zero-angle shift. The best phase claims the peaks it explains and later phases must explain peaks nobody has claimed, which stops absent phases from matching by chance. In tests on synthetic patterns the right set of phases was found about 95 % of the time."}
        limits={[
          "Treat the result as a shortlist to confirm, not a certificate: intensities are barely used, so near-identical polymorphs cannot be told apart and phase fractions are not given.",
          "Weak minor phases close to the noise level can be missed; try the High peak sensitivity.",
          "Only phases in the Materials Project, with fewer than 60 atoms in the cell, are considered. Amorphous content shows up as a broad hump and is ignored.",
          "Scherrer sizes ignore strain, are meaningful up to roughly 100–200 nm, and need the instrument’s own peak width to be accurate."
        ]}
        sources={[
          { label: "Bragg’s law — IUCr Online Dictionary of Crystallography", href: "https://dictionary.iucr.org/Bragg%27s_law" },
          { label: "pymatgen XRDCalculator (the method used for the simulated patterns)", href: "https://pymatgen.org/pymatgen.analysis.diffraction.html" }
        ]}
      />
    </>
  );
}
