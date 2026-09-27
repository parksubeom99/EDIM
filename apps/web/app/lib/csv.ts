/**
 * CSV 읽기 — 한 곳(사양 항목 Import · Tech Data 입력 Import 가 같이 쓴다). 외부 라이브러리 없이 RFC 4180 최소 규칙:
 * 쉼표 구분 · 큰따옴표로 감싼 칸(안의 "" = ") · CRLF/LF · 첫 줄 = 머리글 · 빈 줄은 건너뛴다 · UTF-8 BOM 제거.
 * 반환하는 줄 번호(line)는 **파일의 실제 줄 번호**(머리글 = 1) — 거부 이유를 사람이 찾을 수 있게.
 */
export const MAX_CSV_BYTES = 256 * 1024;
export const MAX_CSV_ROWS = 500;

export function parseCsv(text: string): { header: string[]; rows: { line: number; cells: Record<string, string> }[] } | { error: string } {
  const src = text.replace(/^﻿/, "");
  if (src.length > MAX_CSV_BYTES) return { error: `CSV 는 ${MAX_CSV_BYTES / 1024}KB 까지` };
  const records: { line: number; cells: string[] }[] = [];
  let cur: string[] = [], field = "", q = false, line = 1, start = 1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else { if (ch === "\n") line++; field += ch; }
      continue;
    }
    if (ch === '"') q = true;
    else if (ch === ",") { cur.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      cur.push(field); field = "";
      if (cur.some((c) => c.trim() !== "")) records.push({ line: start, cells: cur });
      cur = []; line++; start = line;
    } else field += ch;
  }
  if (q) return { error: `${start}번째 줄: 닫히지 않은 큰따옴표` };
  cur.push(field);
  if (cur.some((c) => c.trim() !== "")) records.push({ line: start, cells: cur });
  if (records.length === 0) return { error: "빈 CSV" };
  const header = records[0]!.cells.map((h) => h.trim());
  if (records.length - 1 > MAX_CSV_ROWS) return { error: `행은 ${MAX_CSV_ROWS}개까지` };
  return {
    header,
    rows: records.slice(1).map((r) => ({ line: r.line, cells: Object.fromEntries(header.map((h, k) => [h, (r.cells[k] ?? "").trim()])) })),
  };
}
