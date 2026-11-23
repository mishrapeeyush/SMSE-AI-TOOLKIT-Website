import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { ToolAbout } from "@/components/tool-about";

import { CitationGenerator } from "./citation-generator";

export const metadata: Metadata = { title: "Citation Generator" };

export default function CitationsPage() {
  return (
    <>
      <PageHeader
        title="Citation Generator"
        description="Look up a reference by DOI or title, or enter it by hand, and get it formatted in IEEE, APA, MLA, Chicago/Turabian, Harvard or Vancouver — plus BibTeX."
      />
      <CitationGenerator />
      <ToolAbout
        term="a formatted citation"
        definition={"A citation identifies a source so that readers can find it, and each journal or institution prescribes a style — IEEE, APA, MLA, Chicago/Turabian, Harvard or Vancouver — for how its parts (authors, title, journal, year, DOI) are ordered and punctuated. A DOI (digital object identifier) is a permanent code, such as 10.1063/1.4812323, that resolves to a publication’s metadata."}
        steps={[
          "Enter a DOI, search by title, or fill the manual form.",
          "Choose a style and copy the formatted reference, or the BibTeX entry.",
          "Add references to the list to copy a whole bibliography at once; the list is kept in this browser."
        ]}
        how={"A DOI is resolved through doi.org, which returns the publisher’s metadata; title searches use Crossref. The metadata is then formatted by the citeproc-js engine with the official Citation Style Language (CSL) style files, the same engine and styles used by Zotero and Mendeley."}
        limits={[
          "The reference is only as good as the publisher’s metadata; check names, capitalisation and page numbers before submitting.",
          "Not every DOI has complete metadata, and doi.org may briefly refuse many requests at once — wait a few seconds and try again."
        ]}
        sources={[
          { label: "Citation Style Language styles — CC BY-SA 3.0", href: "https://citationstyles.org/" },
          { label: "Crossref REST API", href: "https://www.crossref.org/documentation/retrieve-metadata/rest-api/" }
        ]}
      />
    </>
  );
}
