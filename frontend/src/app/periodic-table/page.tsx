import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { PeriodicTable } from "./periodic-table";

export const metadata: Metadata = { title: "Periodic Table" };

export default function PeriodicTablePage() {
  return (
    <>
      <PageHeader title="Periodic Table" description="Atomic data for all 118 elements. Select an element to see its properties and search for materials that contain it." />
      <PeriodicTable />
      <ToolAbout
        term="the periodic table"
        definition={"The periodic table arranges the 118 known chemical elements by atomic number so that elements with similar chemical behaviour fall in the same column (group). Rows are periods; colours here show the element’s category — alkali metals, transition metals, noble gases and so on."}
        steps={[
          "Hover a category in the legend to highlight it.",
          "Select an element to see its atomic mass, electron configuration, electronegativity, density, melting and boiling points.",
          "Follow “Find materials containing …” to search the Materials Explorer for that element."
        ]}
        how={"The data is a static table bundled with the site, so the page works offline once loaded."}
        limits={[
          "Density is in g/cm³ for solids and liquids but g/L for gases, as the table indicates. Values are for the standard state; some data for the heaviest elements are estimates."
        ]}
        sources={[
          { label: "Periodic-Table-JSON — CC BY-SA 3.0", href: "https://github.com/Bowserinator/Periodic-Table-JSON" }
        ]}
      />
    </>
  );
}
