import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { AUTHORS, GUIDE, INSTITUTE, REPO, SCHOOL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "About",
  description: "What the SMSE AI Toolkit is, who built it, where its data comes from, and what its results can and cannot tell you.",
};

const SOURCES = [
  { name: "NFFA-EUROPE SEM dataset", use: "Training data for micrograph recognition (18,577 images, 10 classes)", licence: "CC BY 4.0", href: "https://doi.org/10.1038/sdata.2018.172" },
  { name: "NIMS MatNavi low-alloy steels", use: "Training data for steel property prediction (912 tensile tests, 95 alloys)", licence: "NIMS terms", href: "https://www.kaggle.com/datasets/konghuanqing/matnavi-mechanical-properties-of-lowalloy-steels" },
  { name: "Materials Project", use: "Materials Explorer, phase diagrams, electrodes, crystal structures, band structures, XRD candidates", licence: "CC BY 4.0", href: "https://next-gen.materialsproject.org/" },
  { name: "Crossref and doi.org", use: "Citation lookup by DOI and by title", licence: "Open metadata", href: "https://www.crossref.org/" },
  { name: "Citation Style Language styles", use: "Official IEEE, APA, MLA, Chicago and Harvard formatting rules", licence: "CC BY-SA 3.0", href: "https://citationstyles.org/" },
  { name: "Periodic-Table-JSON", use: "Element data", licence: "CC BY-SA 3.0", href: "https://github.com/Bowserinator/Periodic-Table-JSON" },
  { name: "Nature Materials, ScienceDaily, Phys.org", use: "Headlines on the home page (links only; read the articles at their sources)", licence: "Publishers’ terms", href: "https://www.nature.com/nmat/" },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About the SMSE AI Toolkit"
        description="A free set of browser-based tools for materials science students and researchers: recognise SEM micrographs, measure grains and pores, identify phases from X-ray diffraction, predict steel properties, explore computed materials, and format citations."
      />

      <div className="space-y-12">
        <section aria-labelledby="what-heading" className="max-w-3xl">
          <h2 id="what-heading" className="text-xl font-semibold tracking-tight">
            What it is
          </h2>
          <p className="mt-3 text-muted">
            Materials science asks how a material’s composition and structure determine its properties. The toolkit puts machine learning and public materials
            databases behind a plain web page for that kind of question — no installation, no account — and wherever it can, the computation happens in your own
            browser, so your images and data files stay on your device.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-accent/60">
                  <t.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <span>
                    <span className="block font-medium group-hover:text-accent">{t.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">{t.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="origin-heading" className="max-w-3xl">
          <h2 id="origin-heading" className="text-xl font-semibold tracking-tight">
            Where it came from
          </h2>
          <p className="mt-3 text-muted">
            The toolkit began as the 2023 B.Tech project <em>“SMSE AI Toolkit: Material Class and Properties Prediction”</em> at the{" "}
            <a href={SCHOOL.url} target="_blank" rel="noreferrer" className="underline hover:text-fg">
              {SCHOOL.name}
            </a>
            , <a href={INSTITUTE.url} target="_blank" rel="noreferrer" className="underline hover:text-fg">{INSTITUTE.name}</a>, guided by{" "}
            <a href={GUIDE.url} target="_blank" rel="noreferrer" className="underline hover:text-fg">
              {GUIDE.name}
            </a>
            . Version 2 rebuilds every tool with stricter validation and adds image analysis, XRD phase matching, phase diagrams, battery electrodes, material pages and a
            periodic table. The{" "}
            <a href={REPO.thesis} target="_blank" rel="noreferrer" className="underline hover:text-fg">
              original thesis
            </a>{" "}
            and all the code are in the project’s{" "}
            <a href={REPO.url} target="_blank" rel="noreferrer" className="underline hover:text-fg">
              open-source repository
            </a>
            .
          </p>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Original authors</h3>
          <ul className="mt-2 text-sm">
            {AUTHORS.map((a) => (
              <li key={a.name}>
                <a href={a.url} target="_blank" rel="noreferrer" className="underline hover:text-accent">
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="privacy-heading" className="max-w-3xl">
          <h2 id="privacy-heading" className="text-xl font-semibold tracking-tight">
            What leaves your device
          </h2>
          <div className="mt-3 space-y-3 text-muted">
            <p>
              <strong className="font-medium text-fg">Stays in your browser:</strong> micrographs, analysis images, XRD pattern files, and steel compositions. The
              recognition and prediction models are downloaded once and run locally.
            </p>
            <p>
              <strong className="font-medium text-fg">Sent to this site’s server:</strong> only lookups — element symbols, a material id, a DOI or a title. The server
              forwards them to the Materials Project, doi.org or Crossref (the Materials Project key stays on the server) and caches the answers. There are no
              accounts and no advertising.
            </p>
            <p>
              <strong className="font-medium text-fg">Monitoring:</strong> to keep the site fast and fix faults, Vercel Analytics counts page views and Speed
              Insights records page-load timings, both without cookies or personal identifiers. If a page crashes, the error text and the page path (never
              your files, inputs or the query string) are written to the site’s server log.
            </p>
          </div>
        </section>

        <section aria-labelledby="data-heading">
          <h2 id="data-heading" className="text-xl font-semibold tracking-tight">
            Data sources and licences
          </h2>
          <Card className="mt-4 overflow-x-auto p-0">
            <table className="w-full min-w-176 text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Used for</th>
                  <th className="px-4 py-3 font-medium">Licence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {SOURCES.map((s) => (
                  <tr key={s.name} className="align-top">
                    <td className="px-4 py-3 font-medium">
                      <a href={s.href} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                        {s.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted">{s.use}</td>
                    <td className="px-4 py-3 text-muted">{s.licence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section aria-labelledby="limits-heading" className="max-w-3xl">
          <h2 id="limits-heading" className="text-xl font-semibold tracking-tight">
            How far to trust a result
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
            <li>
              <strong className="font-medium text-fg">Predictions are estimates.</strong> The micrograph and steel models report a score or a spread, not a guarantee, and
              warn when an input is outside what they were trained on.
            </li>
            <li>
              <strong className="font-medium text-fg">Database values are calculations.</strong> Materials Project properties come from density functional theory at zero
              kelvin: band gaps are typically underestimated and lattice parameters about 1–2 % too large.
            </li>
            <li>
              <strong className="font-medium text-fg">Measurements need your eyes.</strong> Grain size, porosity and XRD matching are aids; always check the overlay,
              the matched lines and the assumptions listed on each tool’s page before reporting a number.
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted">Each tool page ends with its own definition, method and limits.</p>
        </section>

        <section aria-labelledby="cite-heading" className="max-w-3xl">
          <h2 id="cite-heading" className="text-xl font-semibold tracking-tight">
            Citing the toolkit
          </h2>
          <Card className="mt-3">
            <p className="text-sm leading-relaxed">
              Mishra, P., Kumar, K., Manohar, P. D., &amp; Kumhar, S. K. (2023). <em>SMSE AI Toolkit: Material Class and Properties Prediction</em> (B.Tech thesis).
              School of Materials Science and Engineering, NIT Calicut. Supervisor: Dr. Devendra K. Yadav.
            </p>
          </Card>
          <p className="mt-4 text-sm text-muted">
            Found a mistake or want a tool added?{" "}
            <a href={`${REPO.url}/issues`} target="_blank" rel="noreferrer" className="underline hover:text-fg">
              Open an issue on GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
