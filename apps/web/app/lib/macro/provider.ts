import { InMemoryProvider, type DataProvider } from "@edim/macro-dsl";
import type { SlotValues } from "../rccs";

/**
 * M2 — the runtime DataProvider for EDIM Run, built deterministically from the
 * assembled RCCS slots. No LLM, no I/O: same slots → same provider → same value.
 *
 * code refs (IF conditions / Lookup): RCCS slot letters + derived symbols
 *   A product family (EU=1 ER=2 EC=3) · B capacity · C series · D option ·
 *   E material (GI=0 SS=1 AL=2) · F first sequence group · CAP · CMH
 * tables (sample engineering tables; real tables bind to DB in M3):
 *   Table1!A fan kW · Table1!B coil rows · Table1!C panel mm   (rows 1..4 = 10/12/25/55)
 * vars: NS|10 face velocity m/s · NS|15 safety factor · NS|20 kg per kW
 */
const FAMILY: Record<string, number> = { EU: 1, ER: 2, EC: 3 };
const MATERIAL: Record<string, number> = { "": 0, SS: 1, AL: 2 };
const CAP_ROW: Record<string, number> = { "10": 1, "12": 2, "25": 3, "55": 4 };

export const SAMPLE_TABLES = {
  "1!A": { 1: 3.7, 2: 5.5, 3: 11, 4: 22 }, // fan motor kW
  "1!B": { 1: 4, 2: 4, 3: 6, 4: 8 }, // coil rows
  "1!C": { 1: 25, 2: 25, 3: 50, 4: 50 }, // panel mm
} as const;

export const SAMPLE_VARS = { "NS|10": 2.5, "NS|15": 1.15, "NS|20": 18 } as const;

export function codesFromSlots(slots: SlotValues): Record<string, number> {
  const cap = Number(slots.B ?? 0) || 0;
  const d = slots.D ?? "";
  return {
    A: FAMILY[slots.A ?? ""] ?? 0,
    B: cap,
    C: Number(slots.C ?? 0) || 0,
    D: /^\d+$/.test(d) ? Number(d) : d === "A1" ? 1 : d === "H2" ? 2 : 0,
    E: MATERIAL[slots.E ?? ""] ?? 0,
    F: Number((slots.F ?? "").split("-")[0]) || 0,
    CAP: cap,
    CMH: cap * 1000,
    ROW: CAP_ROW[String(cap)] ?? 0,
  };
}

export function providerFromSlots(slots: SlotValues): DataProvider {
  return new InMemoryProvider({
    tables: SAMPLE_TABLES as unknown as Record<string, Record<number, number>>,
    vars: SAMPLE_VARS as unknown as Record<string, number>,
    codes: codesFromSlots(slots),
  });
}
