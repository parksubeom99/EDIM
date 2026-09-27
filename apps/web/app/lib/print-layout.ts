/**
 * H9 · p48 인쇄 양식 편집기 — 양식 안 요소의 종류 · 모양 검사 · 쪽 그리기(순수 함수 · DB 를 모른다).
 *   요소 = { id, kind, x, y, w, h (쪽 대비 %, 0~100) , text? }. 요소 안의 내용은 문서 body(스냅샷)에서 온다 — 양식은 **배치만** 정한다.
 *   저장 = 새 버전(0030). 발행된 문서는 발행 순간의 버전을 따른다(트리거) → 옛 발행본 불변.
 */
export const LAYOUT_KINDS = ["title", "fields", "table", "drawing", "graph", "signature", "logo", "text"] as const;
export type LayoutKind = (typeof LAYOUT_KINDS)[number];
export const KIND_LABEL: Record<LayoutKind, string> = {
  title: "제목", fields: "필드(Data 호출)", table: "표", drawing: "도면", graph: "그래프", signature: "서명칸", logo: "로고", text: "글상자",
};
export interface LayoutElement { id: string; kind: LayoutKind; x: number; y: number; w: number; h: number; text?: string }

const r1 = (n: number) => Math.round(n * 10) / 10;

export function validateElements(raw: unknown): { ok: true; elements: LayoutElement[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 30) return { ok: false, error: "요소는 1~30개" };
  const out: LayoutElement[] = [];
  const ids = new Set<string>();
  for (const [i, e] of raw.entries()) {
    const o = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
    if (!(LAYOUT_KINDS as readonly string[]).includes(String(o.kind))) return { ok: false, error: `${i + 1}번째 요소: 모르는 종류 ${String(o.kind)}` };
    const [x, y, w, h] = [o.x, o.y, o.w, o.h].map(Number) as [number, number, number, number];
    if (![x, y, w, h].every(Number.isFinite)) return { ok: false, error: `${i + 1}번째 요소: 위치·크기는 수` };
    if (x < 0 || y < 0 || w < 3 || h < 2 || x + w > 100.05 || y + h > 100.05) return { ok: false, error: `${i + 1}번째 요소(${KIND_LABEL[o.kind as LayoutKind]}): 쪽 밖으로 나갑니다` };
    let id = typeof o.id === "string" && /^[A-Za-z0-9_-]{1,24}$/.test(o.id) ? o.id : `e${i + 1}`;
    while (ids.has(id)) id = `${id}_`;
    ids.add(id);
    const text = typeof o.text === "string" ? o.text.trim().slice(0, 120) : "";
    out.push({ id, kind: o.kind as LayoutKind, x: r1(x), y: r1(y), w: r1(Math.min(w, 100 - x)), h: r1(Math.min(h, 100 - y)), ...(text ? { text } : {}) });
  }
  return { ok: true, elements: out };
}

/** 기본 양식 배치 — 청사진 p48 의 Technical Report 모양(제목 · 로고 · 필드 · 표 · 그래프 · 서명칸). */
export function defaultLayout(docType: "quotation" | "techdata"): LayoutElement[] {
  return [
    { id: "title", kind: "title", x: 5, y: 3, w: 60, h: 7 },
    { id: "logo", kind: "logo", x: 70, y: 3, w: 25, h: 7, text: "NOVA Solution" },
    { id: "fields", kind: "fields", x: 5, y: 12, w: 90, h: 12 },
    { id: "table", kind: "table", x: 5, y: 26, w: docType === "techdata" ? 50 : 90, h: docType === "techdata" ? 44 : 50 },
    ...(docType === "techdata" ? [{ id: "graph", kind: "graph" as const, x: 57, y: 26, w: 38, h: 44 }] : [{ id: "drawing", kind: "drawing" as const, x: 5, y: 78, w: 45, h: 16 }]),
    { id: "sign", kind: "signature", x: 60, y: 84, w: 35, h: 10 },
  ];
}

const escX = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** 쪽 한 장 — 요소마다 절대 위치 상자에 그 종류의 내용(parts)을 넣는다. title · logo · text 는 요소 글자가 있으면 그것. */
export function renderLayoutPage(version: number, elements: LayoutElement[], parts: Partial<Record<LayoutKind, string>>): string {
  const boxes = elements.map((e) => {
    const own = e.text && (e.kind === "title" || e.kind === "logo" || e.kind === "text") ? (e.kind === "title" ? `<h1>${escX(e.text)}</h1>` : `<div class="${e.kind === "logo" ? "lg" : "tx"}">${escX(e.text)}</div>`) : "";
    const inner = own || parts[e.kind] || `<div class="ph0">${escX(KIND_LABEL[e.kind])} — 이 문서에 없음</div>`;
    return `<div class="le le-${e.kind}" data-el="${e.kind}" data-id="${escX(e.id)}" style="left:${e.x}%;top:${e.y}%;width:${e.w}%;height:${e.h}%">${inner}</div>`;
  }).join("");
  return `<div class="lp" data-testid="print-layout" data-layout-version="${version}">${boxes}</div>`;
}

export const LAYOUT_CSS = `
.lp { position: relative; width: 100%; aspect-ratio: 210 / 297; border: 1px solid #d5dbe1; background: #fff; overflow: hidden; }
.le { position: absolute; overflow: hidden; box-sizing: border-box; padding: 2px; }
.le table { font-size: 10px; } .le h1 { font-size: 18px; margin: 0; } .le h2 { font-size: 12px; margin: 4px 0; }
.le svg { max-width: 100%; max-height: 100%; height: auto; }
.le .lg { font-weight: 800; color: #c0392b; font-size: 16px; text-align: right; }
.le .tx { font-size: 11px; white-space: pre-wrap; }
.le .ph0 { font-size: 10px; color: #8894a0; border: 1px dashed #c5ccd3; height: 100%; display: flex; align-items: center; justify-content: center; }
.sg { display: grid; grid-template-columns: repeat(3, 1fr); height: 100%; border: 1px solid #555; font-size: 10px; }
.sg div { border-left: 1px solid #555; padding: 2px 4px; } .sg div:first-child { border-left: 0; }
@media print { .lp { border: 0; } }
`;
export const SIGNATURE_HTML = `<div class="sg" data-testid="print-signature"><div>작성</div><div>검토</div><div>승인</div></div>`;
