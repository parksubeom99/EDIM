import type { SlotValues } from "../rccs";
import { sectionsOf } from "./bom";
import { codesFromSlots } from "../macro/provider";
import { SAMPLE_VARS } from "../macro/provider";

/** Minimal DXF R12 (ASCII) writer — LINE + TEXT entities. Deterministic. */
function line(x1: number, y1: number, x2: number, y2: number, layer = "0"): string {
  return `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
}
function text(x: number, y: number, h: number, value: string, layer = "TEXT"): string {
  return `0\nTEXT\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n${h}\n1\n${value}\n`;
}
function rect(x: number, y: number, w: number, h: number, layer: string): string {
  return line(x, y, x + w, y, layer) + line(x + w, y, x + w, y + h, layer) + line(x + w, y + h, x, y + h, layer) + line(x, y + h, x, y, layer);
}

export interface DxfMeta { sections: string[]; lengthMm: number; faceMm: number; entities: number }

export function buildDxf(slots: SlotValues, code: string): { dxf: string; meta: DxfMeta } {
  const c = codesFromSlots(slots);
  const cap = c.CAP || 10;
  const sections = sectionsOf(slots);
  const face = Math.round(Math.sqrt((cap * 1000) / SAMPLE_VARS["NS|10"] / 3600) * 1000);
  const segLen = 900;
  const length = sections.length * segLen;
  let ents = "";
  let n = 0;
  // plan view — outline + section splits
  ents += rect(0, 0, length, face, "OUTLINE"); n += 4;
  sections.forEach((s, i) => {
    if (i > 0) { ents += line(i * segLen, 0, i * segLen, face, "SECTION"); n++; }
    ents += text(i * segLen + 120, face / 2, 60, s.toUpperCase()); n++;
  });
  // dimensions
  ents += line(0, -300, length, -300, "DIM"); ents += text(length / 2 - 200, -420, 70, `L=${length}`); n += 2;
  ents += line(-300, 0, -300, face, "DIM"); ents += text(-900, face / 2, 70, `H=${face}`); n += 2;
  ents += text(0, face + 300, 90, `EDIM ${code} - AHU ${cap}000 CMH - PLAN`); n++;
  const dxf =
    `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n` +
    `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n` +
    ["0", "OUTLINE", "SECTION", "DIM", "TEXT"].map((l, i) => `0\nLAYER\n2\n${l}\n70\n0\n62\n${[7, 7, 3, 1, 5][i]}\n6\nCONTINUOUS\n`).join("") +
    `0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${ents}0\nENDSEC\n0\nEOF\n`;
  return { dxf, meta: { sections, lengthMm: length, faceMm: face, entities: n } };
}
