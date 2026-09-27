import type { TenantClient } from "@edim/db";
import { refsOf, referrersOf, makesCycle, type ErpKind, type ErpAttrs } from "@/app/lib/erp-master";

/**
 * H4 · 0027 erp_master 의 DB 쪽 검사 — 가리키는 칸이 이 회사에 **있고 사용 중**인지, 그리고 이 행을 누가 가리키는지.
 * 이미 가리키던 같은 값(keep)은 상대가 사용 중지돼도 다시 저장할 수 있다(0024 partnerOk 와 같은 규칙).
 */
export async function checkRefs(tx: TenantClient, kind: ErpKind, code: string, attrs: ErpAttrs, keep: ErpAttrs = {}): Promise<string | null> {
  for (const r of refsOf(kind, attrs)) {
    if (r.kind === kind && r.code === code) return `${r.field.label}에 자기 자신을 넣을 수 없습니다`;
    const row = await tx.erpMaster.findFirst({ where: { kind: r.kind, code: r.code } });
    if (!row || (!row.active && keep[r.field.key] !== r.code)) return `${r.field.label} ${r.code} 이(가) 없거나 사용 중지입니다`;
  }
  if (kind === "department" && typeof attrs.parent === "string") {
    const all = await tx.erpMaster.findMany({ where: { kind: "department" } });
    const parents = new Map(all.map((d) => [d.code, ((d.attrs ?? {}) as ErpAttrs).parent as string | undefined]));
    if (makesCycle(code, attrs.parent, parents)) return "상위 부서가 돌고 돕니다(순환)";
  }
  return null;
}

/** 이 (kind, code) 를 가리키는 곳 수. nation 은 Company DB 고객·공급처의 nation 글자도 센다. */
export async function erpUsage(tx: TenantClient, kind: ErpKind, code: string): Promise<{ total: number; detail: string[] }> {
  const detail: string[] = [];
  let total = 0;
  for (const r of referrersOf(kind)) {
    const n = await tx.erpMaster.count({ where: { kind: r.kind, attrs: { path: [r.key], equals: code } } });
    if (n) { total += n; detail.push(`${r.kind}.${r.key} ${n}`); }
  }
  if (kind === "nation") {
    const n = await tx.partner.count({ where: { nation: code } });
    if (n) { total += n; detail.push(`Company DB ${n}`); }
  }
  return { total, detail };
}
