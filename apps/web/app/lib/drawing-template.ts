/**
 * H5 · p39 도면 Templet 호출 · p40 Call Sub Drawing · Detail Design 주의사항 — 순수 함수(DB 를 모른다).
 *
 *   하부 도면 = 템플릿의 sub 항목 중 **그 BOM 스냅샷 줄에 실제로 있는** 하위 코드만. 순서 = 설계 우선순위(작을수록 먼저), 같으면 코드 순.
 *   각 줄은 스냅샷 값(품목 · 수량 · 비고)과 그 코드에 등록된 DWG 첨부(F4 · 최신 2D 우선)를 가리킨다. 새 도면 계산은 없다.
 *   주의사항 = note 항목, 우선순위 순.
 * 결과는 도면을 뜨는 순간 drawing.meta 에 박힌다 — 템플릿을 나중에 고쳐도 뜬 도면은 그대로.
 */
export interface TemplateItemLike { kind: string; childCode: string | null; text: string | null; priority: number; createdAt?: Date | string }
export interface SnapItemLike { part: string; qty: number; unit: string; childCode?: string; remarks?: string }
export interface DwgLike { id: string; name: string; kind: string; uploadedAt: Date | string }
export interface SubDrawingRow { order: number; childCode: string; part: string; qty: number; unit: string; remarks: string; priority: number; dwg: { id: string; name: string; kind: string } | null }

const ts = (v: Date | string | undefined) => (v === undefined ? 0 : v instanceof Date ? v.getTime() : Date.parse(v));

export function resolveSubDrawings(items: SnapItemLike[], template: TemplateItemLike[], dwgByCode: Map<string, DwgLike[]>): SubDrawingRow[] {
  const subs = template.filter((t) => t.kind === "sub" && t.childCode)
    .sort((a, b) => a.priority - b.priority || a.childCode!.localeCompare(b.childCode!));
  const out: SubDrawingRow[] = [];
  for (const t of subs) {
    const lines = items.filter((l) => l.childCode === t.childCode);
    if (!lines.length) continue;   // 이 스냅샷에 없는 하위 코드는 부르지 않는다
    const dwgs = [...(dwgByCode.get(t.childCode!) ?? [])].filter((d) => d.kind === "dwg2d" || d.kind === "dwg3d")
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "dwg2d" ? -1 : 1) || ts(b.uploadedAt) - ts(a.uploadedAt));
    const d = dwgs[0];
    out.push({
      order: out.length + 1, childCode: t.childCode!, part: lines[0]!.part, qty: lines.reduce((a, l) => a + l.qty, 0), unit: lines[0]!.unit,
      remarks: lines.map((l) => l.remarks ?? "").filter(Boolean).join(" / "), priority: t.priority,
      dwg: d ? { id: d.id, name: d.name, kind: d.kind } : null,
    });
  }
  return out;
}

export function resolveNotes(template: TemplateItemLike[]): string[] {
  return template.filter((t) => t.kind === "note" && t.text)
    .sort((a, b) => a.priority - b.priority || ts(a.createdAt) - ts(b.createdAt))
    .map((t) => t.text!);
}
