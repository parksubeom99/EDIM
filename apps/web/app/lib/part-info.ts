/**
 * ccmd K · KC-4 · p28 · p38 — 부품 더블클릭 정보(순수 함수). **스냅샷 기준**: 줄 값(코드 · 사양 · 수량 · 공급처 · 단가)은 BOM 스냅샷에 박힌 것,
 * 단가 출처는 스냅샷 줄이 가리키는 단가 이력 행(그때 행 id) — 단가를 나중에 바꿔도 이 정보는 그대로다.
 * 조립순서 = 분해도 순서 = 구획 순서(dims.sections) · 구획 밖 줄(Casing 등)은 0 = "먼저(외함)".
 */
export interface PartSnapLine {
  no?: unknown; section?: unknown; part?: unknown; spec?: unknown; qty?: unknown; unit?: unknown; unitCost?: unknown;
  childCode?: unknown; resolvedCode?: unknown; supplier?: unknown; remarks?: unknown; kind?: unknown; fromSpecial?: unknown;
  priceSource?: { kind?: string; priceId?: string; effectiveFrom?: string; supplier?: string | null } | null;
}
export interface PriceRowLite { id: string; code: string; item: string; price: number; currency: string; supplier: string | null; effectiveFrom: Date | string }
export interface AttLite { id: string; ownerKey: string; name: string; kind: string; uploadedAt: Date | string }

export interface PartInfo {
  no: number; code: string; resolvedCode: string; part: string; spec: string; qty: number; unit: string; section: string;
  supplier: string | null; unitCost: number;
  priceSource: { kind: string; label: string; row: { id: string; price: number; currency: string; supplier: string | null; effectiveFrom: string; item: string } | null };
  dwg: { id: string; name: string; kind: string }[];
  assembly: { order: number; of: number; section: string };
  notes: string[];
  details: { target: string; label: string; value: number; source: string }[];
  remarks: string;
  remarksInfo: string;
  fromSpecial: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const numv = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const day = (v: Date | string) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

export function partInfoOf(a: { lines: PartSnapLine[]; dims: Record<string, unknown> | null; prices: PriceRowLite[]; attachments: AttLite[]; notes: string[] }): PartInfo[] {
  const secs = Array.isArray(a.dims?.sections) ? (a.dims!.sections as { name?: unknown }[]).map((s) => str(s?.name)).filter(Boolean) : [];
  const details = Array.isArray(a.dims?.detail) ? (a.dims!.detail as { target?: unknown; label?: unknown; value?: unknown; source?: unknown }[]) : [];
  const priceById = new Map(a.prices.map((p) => [p.id, p]));
  return a.lines.map((l, i) => {
    const code = str(l.childCode), section = str(l.section);
    const ps = l.priceSource ?? null;
    const row = ps?.priceId ? priceById.get(ps.priceId) ?? null : null;
    const label = !ps ? "출처 기록 없음(단가 이력 이전 스냅샷)"
      : ps.kind === "history" ? `단가 이력 ${ps.effectiveFrom ?? (row ? day(row.effectiveFrom) : "")} 적용분`
      : ps.kind === "currency-mismatch" ? "단가 이력 통화가 KRW 가 아니라 코드 관계 단가를 씀"
      : "코드 관계(p34) 등록 단가";
    const dwg = a.attachments.filter((x) => x.ownerKey === code && (x.kind === "dwg2d" || x.kind === "dwg3d"))
      .map((x) => ({ id: x.id, name: x.name, kind: x.kind }));
    const idx = secs.indexOf(section);
    const det = details.filter((d) => str(d.target) === code || (section && str(d.target) === section))
      .map((d) => ({ target: str(d.target), label: str(d.label), value: numv(d.value), source: str(d.source) }));
    const remarks = str(l.remarks);
    const info = [
      a.notes.length ? `주의사항 ${a.notes.length}` : "주의사항 없음",
      dwg.length ? `DWG ${dwg.length}` : "DWG 없음",
      ...(det.length ? [`세부 치수 ${det.map((d) => `${d.label}=${d.value}`).join(" ")}`] : []),
      ...(remarks ? [remarks] : []),
    ].join(" · ");
    return {
      no: typeof l.no === "number" ? l.no : i + 1, code, resolvedCode: str(l.resolvedCode) || code, part: str(l.part), spec: str(l.spec),
      qty: numv(l.qty), unit: str(l.unit) || "ea", section, supplier: typeof l.supplier === "string" ? l.supplier : null, unitCost: numv(l.unitCost),
      priceSource: { kind: ps?.kind ?? "none", label, row: row ? { id: row.id, price: row.price, currency: row.currency, supplier: row.supplier, effectiveFrom: day(row.effectiveFrom), item: row.item } : null },
      dwg,
      assembly: { order: idx < 0 ? 0 : idx + 1, of: secs.length, section: section || "—" },
      notes: a.notes,
      details: det,
      remarks,
      remarksInfo: info,
      fromSpecial: l.fromSpecial === true,
    };
  });
}
