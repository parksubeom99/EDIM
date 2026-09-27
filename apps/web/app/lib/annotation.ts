/**
 * H10 · p58 그림 제작 Module 1단계 — 도면 주석(선 · 사각형 · 글자 · 치수선) 검사와 DXF 덧붙이기. 순수 함수(DB 를 모른다).
 *   좌표 = 도면 좌표(mm, DXF 모델 공간). 원 도면 DXF 는 바꾸지 않는다 — 내보낼 때만 ANNOT 레이어로 덧붙인다.
 */
export const ANNOT_KINDS = ["line", "rect", "text", "dim"] as const;
export type AnnotKind = (typeof ANNOT_KINDS)[number];
export const ANNOT_LABEL: Record<AnnotKind, string> = { line: "선", rect: "사각형", text: "글자", dim: "치수선" };
export interface Annot { id?: string; kind: AnnotKind; x1: number; y1: number; x2: number; y2: number; text?: string | null }

const LIM = 1e6;
export function validateAnnot(raw: unknown): { ok: true; a: Annot } | { ok: false; error: string } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (!(ANNOT_KINDS as readonly string[]).includes(String(o.kind))) return { ok: false, error: `모르는 주석 종류: ${String(o.kind)}` };
  const kind = o.kind as AnnotKind;
  const [x1, y1] = [Number(o.x1), Number(o.y1)];
  const [x2, y2] = kind === "text" ? [x1, y1] : [Number(o.x2), Number(o.y2)];
  if (![x1, y1, x2, y2].every((v) => Number.isFinite(v) && Math.abs(v) < LIM)) return { ok: false, error: "좌표는 수(mm)" };
  if (kind !== "text" && Math.hypot(x2 - x1, y2 - y1) < 1) return { ok: false, error: `${ANNOT_LABEL[kind]}의 두 점이 같습니다` };
  const text = typeof o.text === "string" ? o.text.trim().slice(0, 80) : "";
  if (kind === "text" && !text) return { ok: false, error: "글자 주석은 글자가 필요합니다" };
  const r = (v: number) => Math.round(v * 10) / 10;
  return { ok: true, a: { kind, x1: r(x1), y1: r(y1), x2: r(x2), y2: r(y2), text: text || null } };
}

const L = (x1: number, y1: number, x2: number, y2: number) => `0\nLINE\n8\nANNOT\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
const T = (x: number, y: number, h: number, v: string) => `0\nTEXT\n8\nANNOT\n10\n${x}\n20\n${y}\n30\n0\n40\n${h}\n1\n${v.replace(/[\r\n]/g, " ")}\n`;

/** 치수선 글자: 적은 글자가 있으면 그것, 없으면 길이(mm, 반올림). */
export const dimLabel = (a: Annot) => a.text || `${Math.round(Math.hypot(a.x2 - a.x1, a.y2 - a.y1))}`;

/** 주석 → DXF 엔티티(ANNOT 레이어). 사각형 = 선 4 · 치수선 = 선 + 양끝 눈금 2 + 길이 글자. */
export function annotEntities(list: Annot[], textH = 80): string {
  return list.map((a) => {
    switch (a.kind) {
      case "line": return L(a.x1, a.y1, a.x2, a.y2);
      case "rect": return L(a.x1, a.y1, a.x2, a.y1) + L(a.x2, a.y1, a.x2, a.y2) + L(a.x2, a.y2, a.x1, a.y2) + L(a.x1, a.y2, a.x1, a.y1);
      case "text": return T(a.x1, a.y1, textH, a.text ?? "");
      case "dim": {
        const len = Math.hypot(a.x2 - a.x1, a.y2 - a.y1) || 1;
        const nx = (-(a.y2 - a.y1) / len) * textH * 0.5, ny = ((a.x2 - a.x1) / len) * textH * 0.5;
        return L(a.x1, a.y1, a.x2, a.y2) + L(a.x1 - nx, a.y1 - ny, a.x1 + nx, a.y1 + ny) + L(a.x2 - nx, a.y2 - ny, a.x2 + nx, a.y2 + ny)
          + T((a.x1 + a.x2) / 2 + nx, (a.y1 + a.y2) / 2 + ny, textH, dimLabel(a));
      }
    }
  }).join("");
}

/** 원 DXF 의 ENTITIES 끝(마지막 ENDSEC 앞)에 주석을 덧붙인 **새 글자**를 돌려준다. 원 글자는 그대로. */
export function withAnnotations(dxf: string, list: Annot[], textH?: number): string {
  if (!list.length) return dxf;
  const n = dxf.replace(/\r\n/g, "\n");
  const i = n.lastIndexOf("0\nENDSEC\n0\nEOF");
  if (i < 0) return dxf;
  return n.slice(0, i) + annotEntities(list, textH) + n.slice(i);
}
