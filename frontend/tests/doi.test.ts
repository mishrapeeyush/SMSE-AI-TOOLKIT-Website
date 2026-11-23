import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDoi } from "../src/lib/doi.ts";

const cases: [string, string | null][] = [
  ["10.1063/1.4812323", "10.1063/1.4812323"],
  ["https://doi.org/10.1063/1.4812323", "10.1063/1.4812323"],
  ["doi: 10.1016/j.commatsci.2021.110328.", "10.1016/j.commatsci.2021.110328"],
  ["https://doi.org/10.1002%2Fadma.201234", "10.1002/adma.201234"],
  ["(doi:10.1038/s41586-020-2649-2)", "10.1038/s41586-020-2649-2"],
  ["10.1038/s41586-020-2649-2>", "10.1038/s41586-020-2649-2"],
  ["DOI 10.1007/s11661-010-0301-x\"", "10.1007/s11661-010-0301-x"],
  ["https://doi.org/10.1038/s41586-020-2649-2?utm_source=x#top", "10.1038/s41586-020-2649-2"],
  ["10.1016/S0921-5093(03)00123-4", "10.1016/S0921-5093(03)00123-4"], // balanced parentheses belong to the DOI
  ["see (10.1016/S0921-5093(03)00123-4).", "10.1016/S0921-5093(03)00123-4"],
  ["10.1000/xyz123 and more text", "10.1000/xyz123"],
  ["10.1002/%zz-bad-escape", "10.1002/%zz-bad-escape"], // malformed escape must not throw
  ["not a doi", null],
  ["https://example.com/page", null],
  ["", null],
];

for (const [input, expected] of cases) {
  test(`parseDoi(${JSON.stringify(input)})`, () => assert.equal(parseDoi(input), expected));
}
