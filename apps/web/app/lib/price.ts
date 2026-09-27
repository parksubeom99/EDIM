/**
 * p67 단가 이력 → "현재 단가" 판정 — **한 곳**. 가격 화면(/api/setup/prices)과 BOM Run 이 같은 함수를 쓴다.
 *
 *   현재 단가 = effectiveFrom <= 오늘(회사 시간대 · businessToday) 인 행 중 effectiveFrom 최신, 같으면 createdAt 최신.
 *   미래 유효일 행은 "예정" — 적용하지 않는다.
 *   BOM 줄은 그 줄의 item(buy 표가 고르는 행) 행을 먼저, 없으면 item "" 행을 쓴다.
 *   KRW 가 아니면 적용하지 않는다(환산은 범위 밖) — 관계 값을 그대로 두고 출처에 currency-mismatch.
 */
export interface PriceRowLike {
  id: string;
  item: string;
  price: number;
  currency: string;
  supplier: string;
  /** YYYY-MM-DD */
  effectiveFrom: string;
  createdAt: Date | string;
}

const ts = (v: Date | string) => (v instanceof Date ? v.getTime() : Date.parse(v));

/** 오늘 기준 item 별 현재 단가. 입력 순서에 기대지 않고 스스로 정렬한다. */
export function currentByItem<T extends PriceRowLike>(rows: T[], today: string): Record<string, T> {
  const sorted = [...rows].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || ts(b.createdAt) - ts(a.createdAt));
  const out: Record<string, T> = {};
  for (const r of sorted) if (r.effectiveFrom <= today && !out[r.item]) out[r.item] = r;
  return out;
}

/** 그 줄의 현재 단가: item 이 맞는 행 → 없으면 item "" 행 → 없으면 null. */
export function currentPriceFor<T extends PriceRowLike>(rows: T[], item: string | null, today: string): T | null {
  const cur = currentByItem(rows, today);
  return (item !== null && item !== "" ? cur[item] : undefined) ?? cur[""] ?? null;
}

export type PriceSource =
  | { kind: "history"; priceId: string; effectiveFrom: string; supplier: string }
  | { kind: "relationship" }
  | { kind: "currency-mismatch"; priceId: string };

/**
 * BOM 줄에 단가 이력을 입힌다(순수 함수 — 스냅샷을 뜨기 **전**에 한 번).
 * 원 단위 정수: Math.round(price). 관계 값의 배율(mat.mf 등)은 이력 단가에 곱하지 않는다 — 이력은 실제 구매 단가다.
 * 카탈로그는 건드리지 않는다(catalogFp 불변).
 */
export function applyPriceHistory<L extends { childCode: string; unitCost: number }>(
  lines: L[],
  rowsByCode: Map<string, PriceRowLike[]>,
  itemOf: (line: L) => string | null,
  today: string,
): (L & { priceSource: PriceSource })[] {
  return lines.map((l) => {
    const rows = rowsByCode.get(l.childCode) ?? [];
    const cur = rows.length ? currentPriceFor(rows, itemOf(l), today) : null;
    if (!cur) return { ...l, priceSource: { kind: "relationship" } as PriceSource };
    if (cur.currency !== "KRW") return { ...l, priceSource: { kind: "currency-mismatch", priceId: cur.id } as PriceSource };
    return {
      ...l,
      unitCost: Math.round(cur.price),
      priceSource: { kind: "history", priceId: cur.id, effectiveFrom: cur.effectiveFrom, supplier: cur.supplier } as PriceSource,
    };
  });
}

/** 화면·인쇄본 표기 */
export function priceSourceLabel(s: PriceSource | undefined | null): string {
  if (!s) return "";
  return s.kind === "history" ? `이력 ${s.effectiveFrom}` : s.kind === "currency-mismatch" ? "통화 불일치" : "관계값";
}
