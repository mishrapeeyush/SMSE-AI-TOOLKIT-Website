import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { SteelPredictor } from "./steel-predictor";

export const metadata: Metadata = { title: "Steel Property Prediction" };

export default function SteelPage() {
  return (
    <>
      <PageHeader
        title="Steel Property Prediction"
        description="Estimate the mechanical properties of a low-alloy steel from its composition and test temperature. Trained on the NIMS MatNavi dataset of 900+ tensile tests."
      />
      <SteelPredictor />
      <ToolAbout
        term="low-alloy steel property prediction"
        definition={"Four numbers describe how a steel behaves in a tensile test: the 0.2 % proof stress (the stress that leaves 0.2 % permanent strain — the practical yield strength), the tensile strength (the highest stress reached), the elongation (how far the sample stretches before breaking) and the reduction in area (how much its cross-section shrinks at the break). Strength and ductility both depend on composition and on the temperature of the test."}
        steps={[
          "Pick a dataset alloy as a starting point, or type your own composition in weight per cent (a decimal point or comma is fine; leave a field blank for “none”).",
          "Set the test temperature with the slider.",
          "Read the four predictions and their ± spread, and the plot of how each property changes with temperature.",
          "Heed any amber warning: it means an input is outside the range the model was trained on."
        ]}
        how={"The model is an ensemble of extra-trees regressors trained on 912 tensile tests of 95 low-alloy steels from the NIMS MatNavi database. The ± value is the spread of the individual trees: roughly two thirds of unseen measurements fall inside it. Scores in the validation table come from 5-fold cross-validation grouped by alloy, so every score is on steels the model never saw. The model runs in your browser."}
        limits={[
          "Valid only for low-alloy steels with compositions and temperatures in the training ranges; outside them the prediction is an extrapolation.",
          "The data has no heat-treatment or microstructure information, so two steels of the same composition but different processing look identical to the model.",
          "The ± is the model’s internal spread, not a confidence interval; real scatter between batches can be larger."
        ]}
        sources={[
          { label: "NIMS MatNavi — mechanical properties of low-alloy steels (Kaggle copy)", href: "https://www.kaggle.com/datasets/konghuanqing/matnavi-mechanical-properties-of-lowalloy-steels" }
        ]}
      />
    </>
  );
}
