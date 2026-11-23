import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDecimal } from "../src/lib/parse-number.ts";

const ok: [string, number][] = [["0.3", 0.3], ["0,3", 0.3], [" 1.5 ", 1.5], [".5", 0.5], ["5.", 5], ["0", 0], ["1e-3", 0.001], ["+2", 2], ["-1", -1]];
const bad = ["", "  ", "abc", "0.16abc", "1,234.5", "1.234,5", "1,2,3", "--1", "1e", "NaN", "Infinity", "0x10", "1 2"];

for (const [s, v] of ok) test(`accepts ${JSON.stringify(s)}`, () => assert.equal(parseDecimal(s), v));
for (const s of bad) test(`rejects ${JSON.stringify(s)}`, () => assert.equal(parseDecimal(s), null));
