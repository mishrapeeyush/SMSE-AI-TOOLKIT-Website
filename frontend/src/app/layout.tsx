import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { Nav } from "@/components/nav";
import { INSTITUTE, SCHOOL, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "SMSE AI Toolkit", template: "%s · SMSE AI Toolkit" },
  description:
    "AI tools for materials science: SEM micrograph recognition, grain-size and porosity analysis, XRD phase matching, steel property prediction, Materials Project lookup, phase diagrams, battery electrodes and citation generation.",
  openGraph: { siteName: "SMSE AI Toolkit", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
            <span>
              SMSE AI Toolkit · <Link href="/about" className="underline hover:text-fg">About</Link> ·{" "}
              <a className="underline hover:text-fg" href={SCHOOL.url} target="_blank" rel="noreferrer">
                {SCHOOL.name}
              </a>
              ,{" "}
              <a className="underline hover:text-fg" href={INSTITUTE.url} target="_blank" rel="noreferrer">
                {INSTITUTE.name}
              </a>
            </span>
            <span>
              Data: <a className="underline hover:text-fg" href="https://materialsproject.org">Materials Project</a>,{" "}
              <a className="underline hover:text-fg" href="https://doi.org/10.1038/sdata.2018.172">NFFA-EUROPE SEM</a>, NIMS MatNavi
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
