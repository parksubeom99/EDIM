import { readDxfEntities } from "../output/dxf-svg";

/**
 * B · ① extract — 원천 자료 1건 → 특징 행. 결정론 · 읽기 전용 · 입력 1건만 본다(격리 작업자).
 *
 * DXF 경로(ccmd J STEP 0 결정): 우리 생성기(dxf.ts)는 DIMENSION 개체 없이 치수를 **글자**(`L=4500`,
 * `CASING H=2200` …)와 선으로 적는다. 그래서 새 파서 없이 기존 읽기(readDxfEntities)로
 *   (1) `이름=값[단위]` 글자 → 치수 특징
 *   (2) SECTION 층 세로선 + 외곽 → 구획 경계, 구획 안의 이름 글자 → 구획 길이 특징(기하에서 잰 값)
 *   (3) 표제 글자의 RCCS 코드(`EU-25-2123-…`) → 코드 슬롯 특징
 * 을 뽑는다. 문서(techdoc)는 1수준에서 표 형태 CSV 만(열 이름 = 특징 이름, 행 하나 = 기록 하나).
 */
export interface RawFeature {
  /** 원천 안의 기록 번호 — 도면은 0 하나, CSV 는 행마다 0,1,2… */
  record: number;
  /** 원래 적힌 이름(정렬 전) */
  rawLabel: string;
  value: number;
  unit: string;
  layer: string;
  /** 이 특징이 어디서 왔나 — 글자 · 기하 · 코드 · 표 */
  via: "text" | "geometry" | "code" | "table";
}

const DIM_TEXT = /^\s*([A-Za-z가-힣][A-Za-z가-힣 _.]{0,30}?)\s*=\s*(-?\d+(?:\.\d+)?)\s*(mm|in|inch)?\s*$/i;
const RCCS = /\b([A-Z]{2})-(\d{2,3})-(\d{3,4})(?:-(\d{3}[A-Z0-9]*))?/;

export function extractDxf(dxf: string): RawFeature[] {
  const e = readDxfEntities(dxf);
  const out: RawFeature[] = [];
  for (const t of e.texts) {
    const m = DIM_TEXT.exec(t.value);
    if (m) out.push({ record: 0, rawLabel: m[1]!.trim(), value: Number(m[2]), unit: (m[3] ?? "mm").toLowerCase(), layer: t.layer, via: "text" });
    const c = RCCS.exec(t.value);
    if (c && /EDIM\s/.test(t.value)) out.push({ record: 0, rawLabel: "code.B", value: Number(c[2]), unit: "", layer: t.layer, via: "code" });
  }
  // 구획 길이 — 외곽의 x 범위와 SECTION 세로선이 경계다. 경계 사이에 놓인 대문자 이름 글자가 그 구획의 이름이다.
  const outline = e.lines.filter((l) => l.layer === "OUTLINE");
  if (outline.length > 0) {
    const xs = outline.flatMap((l) => [l.x1, l.x2]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const cuts = e.lines.filter((l) => l.layer === "SECTION" && l.x1 === l.x2).map((l) => l.x1);
    const edges = [...new Set([x0, ...cuts, x1])].sort((a, b) => a - b);
    for (let i = 0; i + 1 < edges.length; i++) {
      const a = edges[i]!, b = edges[i + 1]!;
      const name = e.texts.find((t) => t.layer === "TEXT" && t.x > a && t.x < b && /^[A-Z][A-Z0-9 ]{1,20}$/.test(t.value.trim()) && !t.value.startsWith("DIR "));
      if (name) out.push({ record: 0, rawLabel: `SECTION ${name.value.trim()}`, value: Math.round((b - a) * 1000) / 1000, unit: "mm", layer: "SECTION", via: "geometry" });
    }
  }
  return out;
}

/** 기술문서 CSV — 첫 줄이 열 이름, 숫자 칸만 특징. 숫자가 아닌 칸·빈 칸은 건너뛴다. */
export function extractCsv(csv: string): RawFeature[] {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const head = lines[0]!.split(",").map((h) => h.trim());
  const out: RawFeature[] = [];
  lines.slice(1).forEach((row, r) => {
    row.split(",").forEach((cell, k) => {
      const v = Number(cell.trim());
      const h = head[k];
      if (!h || cell.trim() === "" || !Number.isFinite(v)) return;
      const um = /\(([^)]+)\)\s*$/.exec(h);
      out.push({ record: r, rawLabel: um ? h.slice(0, um.index).trim() : h, value: v, unit: (um?.[1] ?? "").toLowerCase(), layer: "TABLE", via: "table" });
    });
  });
  return out;
}

export function extractSource(kind: "drawing" | "techdoc", content: string): RawFeature[] {
  return kind === "drawing" ? extractDxf(content) : extractCsv(content);
}
