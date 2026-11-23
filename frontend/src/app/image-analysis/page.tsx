import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { ImageAnalyzer } from "./image-analyzer";

export const metadata: Metadata = { title: "Image Analysis" };

export default function ImageAnalysisPage() {
  return (
    <>
      <PageHeader
        title="Image Analysis"
        description="Measure grain size (ASTM E112 planimetric and lineal-intercept methods) and porosity from optical or SEM micrographs — automatically thresholded, calibrated with the scale bar, entirely in your browser."
      />
      <ImageAnalyzer />
      <ToolAbout
        term="grain size and porosity analysis"
        definition={"Grain size is the average size of the crystals (grains) that make up a polycrystalline metal or ceramic; the ASTM E112 standard expresses it as a grain size number G that grows as grains get finer. Porosity is the fraction of a section’s area occupied by pores. Both are measured on a flat polished section, so they describe a two-dimensional slice of a three-dimensional structure."}
        steps={[
          "Open a micrograph (or try a synthetic example). Untick “Crop microscope data bar” only if the bar should be analysed.",
          "Set the scale: type the micrometres per pixel, or choose “Measure scale bar”, click both ends of the bar and enter its length.",
          "Choose Grain size or Porosity and say whether boundaries or pores are dark. Check the overlay, then adjust threshold, smoothing and the minimum feature size until it follows what you see.",
          "Read the results and download the per-feature CSV."
        ]}
        how={"The image is converted to grey levels, an uneven background is removed, noise is smoothed, and a threshold (Otsu’s method, or your own) separates features from the matrix. Connected regions are then counted. Grain size is reported by two ASTM E112 methods: the planimetric (Jeffries) method from the grain count per area, and the Heyn lineal-intercept method from boundary crossings along test lines. Everything runs in your browser."}
        limits={[
          "It needs clear contrast between features and background. Thresholding cannot separate touching grains or pores that have no visible boundary between them.",
          "E112 asks for at least 50 grains per field; the tool warns when fewer are counted.",
          "Accuracy was verified on synthetic microstructures with known answers (about 1 % error for grain size, 0.1 percentage points for porosity). Real images with heavy noise, etching artefacts or relief may be less accurate, so always inspect the overlay."
        ]}
        sources={[
          { label: "ASTM E112 — Standard Test Methods for Determining Average Grain Size", href: "https://www.astm.org/e0112-13r21.html" }
        ]}
      />
    </>
  );
}
