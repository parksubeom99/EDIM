import { describe, it, expect } from "vitest";
import { parseCsv } from "../app/lib/csv";

describe("CSV reader (F3 · F7 import)", () => {
  it("header + rows with real file line numbers, quoted commas, BOM and CRLF", () => {
    const r = parseCsv('﻿key,label\r\nfan_kw,"팬 동력, kW"\r\n\r\nsp,"say ""hi"""\r\n');
    if ("error" in r) throw new Error(r.error);
    expect(r.header).toEqual(["key", "label"]);
    expect(r.rows).toEqual([{ line: 2, cells: { key: "fan_kw", label: "팬 동력, kW" } }, { line: 4, cells: { key: "sp", label: 'say "hi"' } }]);
  });
  it("unterminated quote is an error, not a guess", () => {
    expect(parseCsv('a,b\n"x,1\n')).toHaveProperty("error");
  });
});
