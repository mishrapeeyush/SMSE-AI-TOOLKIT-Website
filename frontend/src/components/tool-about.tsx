import type { ReactNode } from "react";

import { Card } from "@/components/ui";

export type Source = { label: string; href: string };

/**
 * The reference section at the bottom of every tool page: a definition, how to use the tool, how it works,
 * its limits, and where the data comes from. Real headings (h2 → h3) so the structure is navigable by
 * screen readers and readable by search engines.
 */
export function ToolAbout({
  term,
  definition,
  steps,
  how,
  limits,
  sources,
}: {
  /** The thing the tool measures or computes, as a short noun phrase (used in the section heading). */
  term: string;
  definition: ReactNode;
  steps: ReactNode[];
  how: ReactNode;
  limits: ReactNode[];
  sources?: Source[];
}) {
  return (
    <section aria-labelledby="about-tool" className="mt-12">
      <h2 id="about-tool" className="mb-4 text-xl font-semibold tracking-tight">
        About this tool
      </h2>
      <Card>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">What is {term}?</h3>
              <p className="mt-2 text-sm leading-relaxed">{definition}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">How to use it</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
                {steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">How it works</h3>
              <p className="mt-2 text-sm leading-relaxed">{how}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Limits to keep in mind</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                {limits.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
            {sources && sources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Data and references</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {sources.map((s) => (
                    <li key={s.href}>
                      <a href={s.href} target="_blank" rel="noreferrer" className="underline hover:text-accent">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
