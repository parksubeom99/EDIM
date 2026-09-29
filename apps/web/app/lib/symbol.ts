/**
 * ccmd K · KC-3 · p58 설계 심볼 라이브러리 — 심볼 모양(primitives) 검사 · 배치 검사 · DXF 전개. 순수 함수(DB 를 모른다).
 *   모양 = 선 · 원 · 호 · 사각형(mm · 중심 0,0). 배치 = 도면 좌표(mm) x · y + 회전(0·90·180·270) + 배율.
 *   DXF 로는 **선 전개**로 나간다(블록 삽입 대신) — SYMBOL 레이어의 LINE · CIRCLE 만. 호는 선분 여러 개로 편다(R12 뷰어 · SVG 변환이 LINE · CIRCLE 만 읽는다).
 *   원 도면 DXF 는 바꾸지 않는다 — 내보낼 때만 덧붙인다(H10 주석과 같은 방식).
 */
export type Prim =
  | { t: "line"; x1: number; y1: number; x2: number; y2: number }
  | { t: "circle"; x: number; y: number; r: number }
  | { t: "arc"; x: number; y: number; r: number; a0: number; a1: number }
  | { t: "rect"; x: number; y: number; w: number; h: number };
export interface SymbolPlace { x: number; y: number; rot: number; scale: number }

const LIM = 1e6;
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < LIM;

export function validatePrims(raw: unknown): { ok: true; prims: Prim[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 64) return { ok: false, error: "심볼 모양은 1~64개 도형입니다" };
  const out: Prim[] = [];
  for (const p of raw) {
    const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
    if (o.t === "line" && fin(o.x1) && fin(o.y1) && fin(o.x2) && fin(o.y2)) out.push({ t: "line", x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 });
    else if (o.t === "circle" && fin(o.x) && fin(o.y) && fin(o.r) && o.r > 0) out.push({ t: "circle", x: o.x, y: o.y, r: o.r });
    else if (o.t === "arc" && fin(o.x) && fin(o.y) && fin(o.r) && o.r > 0 && fin(o.a0) && fin(o.a1) && o.a1 > o.a0) out.push({ t: "arc", x: o.x, y: o.y, r: o.r, a0: o.a0, a1: o.a1 });
    else if (o.t === "rect" && fin(o.x) && fin(o.y) && fin(o.w) && fin(o.h) && o.w > 0 && o.h > 0) out.push({ t: "rect", x: o.x, y: o.y, w: o.w, h: o.h });
    else return { ok: false, error: `모르는 도형 또는 값이 틀림: ${JSON.stringify(p).slice(0, 60)}` };
  }
  return { ok: true, prims: out };
}

export const ROTS = [0, 90, 180, 270] as const;
export function validatePlace(raw: unknown, base?: SymbolPlace): { ok: true; p: SymbolPlace } | { ok: false; error: string } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const moving = o.dx !== undefined || o.dy !== undefined;
  const x = moving && base ? base.x + Number(o.dx ?? 0) : Number(o.x ?? base?.x);
  const y = moving && base ? base.y + Number(o.dy ?? 0) : Number(o.y ?? base?.y);
  const rot = Number(o.rot ?? base?.rot ?? 0);
  const scale = Number(o.scale ?? base?.scale ?? 1);
  if (!fin(x) || !fin(y)) return { ok: false, error: "좌표는 수(mm)" };
  if (!(ROTS as readonly number[]).includes(rot)) return { ok: false, error: "회전은 0 · 90 · 180 · 270" };
  if (!fin(scale) || scale < 0.1 || scale > 20) return { ok: false, error: "배율은 0.1~20" };
  const r = (v: number) => Math.round(v * 10) / 10;
  return { ok: true, p: { x: r(x), y: r(y), rot, scale: Math.round(scale * 100) / 100 } };
}

/** 도형 → 선분 · 원(배치 변환을 입힌 도면 좌표). 호는 15° 이하 선분으로 편다. */
export function expand(prims: Prim[], at: SymbolPlace): { lines: [number, number, number, number][]; circles: [number, number, number][] } {
  const rad = (at.rot * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
  const P = (x: number, y: number): [number, number] => {
    const X = x * at.scale, Y = y * at.scale;
    return [Math.round((at.x + X * c - Y * s) * 10) / 10, Math.round((at.y + X * s + Y * c) * 10) / 10];
  };
  const lines: [number, number, number, number][] = [];
  const circles: [number, number, number][] = [];
  const seg = (x1: number, y1: number, x2: number, y2: number) => { const a = P(x1, y1), b = P(x2, y2); lines.push([a[0], a[1], b[0], b[1]]); };
  for (const p of prims) {
    if (p.t === "line") seg(p.x1, p.y1, p.x2, p.y2);
    else if (p.t === "rect") { seg(p.x, p.y, p.x + p.w, p.y); seg(p.x + p.w, p.y, p.x + p.w, p.y + p.h); seg(p.x + p.w, p.y + p.h, p.x, p.y + p.h); seg(p.x, p.y + p.h, p.x, p.y); }
    else if (p.t === "circle") { const q = P(p.x, p.y); circles.push([q[0], q[1], Math.round(p.r * at.scale * 10) / 10]); }
    else {
      const n = Math.max(2, Math.ceil((p.a1 - p.a0) / 15));
      for (let i = 0; i < n; i++) {
        const t0 = ((p.a0 + ((p.a1 - p.a0) * i) / n) * Math.PI) / 180, t1 = ((p.a0 + ((p.a1 - p.a0) * (i + 1)) / n) * Math.PI) / 180;
        seg(p.x + p.r * Math.cos(t0), p.y + p.r * Math.sin(t0), p.x + p.r * Math.cos(t1), p.y + p.r * Math.sin(t1));
      }
    }
  }
  return { lines, circles };
}

/** 배치된 심볼 → DXF 엔티티(SYMBOL 레이어). 엔티티 수도 함께(e2e 가 ezdxf 로 센 수와 맞춘다). */
export function symbolEntities(list: { prims: Prim[]; at: SymbolPlace }[]): { ents: string; count: number } {
  let ents = "", count = 0;
  for (const it of list) {
    const e = expand(it.prims, it.at);
    for (const [x1, y1, x2, y2] of e.lines) { ents += `0\nLINE\n8\nSYMBOL\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`; count++; }
    for (const [x, y, r] of e.circles) { ents += `0\nCIRCLE\n8\nSYMBOL\n10\n${x}\n20\n${y}\n30\n0\n40\n${r}\n`; count++; }
  }
  return { ents, count };
}

/** 원 DXF 의 ENTITIES 끝(마지막 ENDSEC 앞)에 덧붙인 **새 글자**. 원 글자는 그대로. */
export function withSymbols(dxf: string, list: { prims: Prim[]; at: SymbolPlace }[]): string {
  if (!list.length) return dxf;
  const n = dxf.replace(/\r\n/g, "\n");
  const i = n.lastIndexOf("0\nENDSEC\n0\nEOF");
  if (i < 0) return dxf;
  return n.slice(0, i) + symbolEntities(list).ents + n.slice(i);
}
