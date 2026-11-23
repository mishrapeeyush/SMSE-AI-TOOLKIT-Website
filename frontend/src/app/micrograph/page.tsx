import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { MicrographClassifier } from "./micrograph-classifier";

export const metadata: Metadata = { title: "Micrograph Recognition" };

export default function MicrographPage() {
  return (
    <>
      <PageHeader
        title="Micrograph Recognition"
        description="Classify scanning electron microscope images into ten nanoscience categories using a convolutional neural network fine-tuned on the NFFA-EUROPE SEM dataset."
      />
      <MicrographClassifier />
      <ToolAbout
        term="micrograph recognition"
        definition={"A micrograph is an image of a material’s microstructure. Scanning electron microscope (SEM) micrographs show surface morphology from the micrometre down to the nanometre scale. Recognition here means assigning an SEM image to one of ten nanoscience categories — Biological, Fibres, Films and coated surfaces, MEMS devices and electrodes, Nanowires, Particles, Patterned surfaces, Porous or sponge structures, Powders and Tips."}
        steps={[
          "Drop an SEM image onto the page (JPG or PNG), pick a sample image, or use the camera.",
          "Read the top category, its confidence, and the runners-up. A warning appears when the image does not look like any trained category.",
          "Open the heat map to see which regions of the image drove the decision.",
          "Optional: add your own categories from a few example images of your lab’s samples; they are stored only in this browser."
        ]}
        how={"A convolutional neural network (EfficientNet-B0, pre-trained on ImageNet) was fine-tuned on the 18,577 labelled images of the NFFA-EUROPE SEM dataset. The microscope’s data bar is cropped first so the network learns morphology instead of reading the printed scale text, and each prediction averages eight rotated and mirrored views. The model runs entirely in your browser with ONNX Runtime Web, so images never leave your device."}
        limits={[
          "It recognises nanoscience categories, not metallurgical phases such as ferrite, pearlite or martensite.",
          "Accuracy (about 96 %) was measured on images randomly held out from the same dataset; images from other microscopes or preparations may do worse, and the smallest classes (Fibres, Porous sponge) had only a few dozen test images.",
          "Confidence is the model’s own score, not a calibrated probability. The “not recognised” check catches ordinary photographs far better than textures."
        ]}
        sources={[
          { label: "NFFA-EUROPE SEM dataset — Aversa et al., Scientific Data 5, 180172 (2018), CC BY 4.0", href: "https://doi.org/10.1038/sdata.2018.172" }
        ]}
      />
    </>
  );
}
