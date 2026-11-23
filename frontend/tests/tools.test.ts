// Keeps the tool list, nav, home page, sitemap, social image and README in sync: a tool that exists as a
// page must be listed everywhere, and a listed tool must exist.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import sitemap from "../src/app/sitemap.ts";
import { AUTHORS, GUIDE, INSTITUTE, SCHOOL } from "../src/lib/site.ts";
import { TOOLS } from "../src/lib/tools.ts";

const app = fileURLToPath(new URL("../src/app/", import.meta.url));
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

/** Top-level routes that have a page (excluding the home page and dynamic segments, which are not tools). */
/** Informational pages that are not tools (they appear in the sitemap and the footer, not in the tool list). */
const INFO_PAGES = ["about"];
const pages = readdirSync(app).filter((d) => statSync(app + d).isDirectory() && !d.startsWith("[") && d !== "api" && !INFO_PAGES.includes(d) && existsSync(`${app}${d}/page.tsx`));

test("every page under src/app is a listed tool, and every listed tool has a page", () => {
  const listed = TOOLS.map((t) => t.href.slice(1));
  // /materials/[id] hangs off the Materials Explorer, so it is not a separate entry
  assert.deepEqual([...pages].sort(), [...listed].sort());
});

test("tool entries are complete and unique", () => {
  assert.equal(new Set(TOOLS.map((t) => t.href)).size, TOOLS.length);
  assert.equal(new Set(TOOLS.map((t) => t.name)).size, TOOLS.length);
  assert.equal(new Set(TOOLS.map((t) => t.short)).size, TOOLS.length);
  for (const t of TOOLS) {
    assert.match(t.href, /^\/[a-z-]+$/);
    assert.ok(t.name && t.short && t.description.length > 30 && t.icon, `${t.href} is incomplete`);
  }
});

test("the sitemap lists the home page and every tool", () => {
  const urls = sitemap().map((e) => new URL(e.url).pathname);
  assert.deepEqual(urls.sort(), ["/", ...INFO_PAGES.map((p) => `/${p}`), ...TOOLS.map((t) => t.href)].sort());
});

test("the About page exists and is linked from the footer and the home page", () => {
  for (const p of INFO_PAGES) assert.ok(existsSync(`${app}${p}/page.tsx`), `${p} page missing`);
  assert.ok(readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8").includes('href="/about"'), "footer link");
  assert.ok(readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8").includes('href="/about"'), "home link");
});

test("the README documents every tool by name", () => {
  for (const t of TOOLS) assert.ok(readme.includes(`**${t.name}**`), `README is missing "${t.name}"`);
});

test("home page copy: every tool is in the upgrades table or the tool grid, and the grid is driven by TOOLS", () => {
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.ok(home.includes("TOOLS.map"), "tool grid must be generated from TOOLS");
  const nav = readFileSync(new URL("../src/components/nav.tsx", import.meta.url), "utf8");
  assert.ok(nav.includes("TOOLS.map"), "nav must be generated from TOOLS");
  const og = readFileSync(new URL("../src/app/opengraph-image.tsx", import.meta.url), "utf8");
  assert.ok(og.includes("ALL_TOOLS.map"), "social image must be generated from TOOLS");
});

test("school, institute, guide and author links are https and the README links them too", () => {
  for (const u of [SCHOOL.url, INSTITUTE.url, GUIDE.url, ...AUTHORS.map((a) => a.url)]) assert.match(u, /^https:\/\/(www\.linkedin\.com\/in\/|nitc\.ac\.in)/);
  assert.equal(AUTHORS.length, 4);
  for (const l of [SCHOOL, INSTITUTE, GUIDE, ...AUTHORS]) assert.ok(readme.includes(l.url), `README lacks ${l.url}`);
});
