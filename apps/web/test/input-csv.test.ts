import { describe, it, expect } from "vitest";
import { importInputCsv } from "../app/lib/input-csv";

describe("F7 Tech Data input CSV import", () => {
  it("fills template items", () => {
    expect(importInputCsv("key,value\ntemperature,27\nhumidity,55\n", ["temperature", "humidity"])).toEqual({ values: { temperature: "27", humidity: "55" } });
  });
  it("rejects with file line numbers and fills nothing", () => {
    const r = importInputCsv("key,value\ntemperature,27\npressure2,1\nhumidity,abc\n", ["temperature", "humidity"]);
    expect("error" in r && r.error).toMatch(/3번째 줄.*pressure2.*4번째 줄.*humidity/);
  });
});
