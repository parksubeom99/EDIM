/**
 * H4 · p64 [ERP Set-up] 기준정보 6종 — 칸 정의 · 값 검사 · 서로 가리키는 관계를 **한 곳**에(0027 erp_master).
 * 화면(/setup/erp)과 API(/api/setup/erp-master)가 같은 정의를 쓴다. 순수 함수 — DB 를 모른다(그래서 단위 테스트가 된다).
 *
 * 관계(가리키는 칸 = 상대의 code): Department.parent → Department · Employee.department → Department ·
 * Inventory.warehouse → Warehouse · Bank.nation → Nation. 그리고 Company DB(partner.nation 글자) → Nation.
 * 가리키는 행이 있으면 삭제는 409 — 대신 사용 중지.
 */
export const ERP_KINDS = ["department", "warehouse", "inventory", "bank", "employee", "nation"] as const;
export type ErpKind = (typeof ERP_KINDS)[number];
export const isErpKind = (v: unknown): v is ErpKind => typeof v === "string" && (ERP_KINDS as readonly string[]).includes(v);

export interface ErpField { key: string; label: string; type: "text" | "number"; ref?: ErpKind; required?: boolean; max?: number }

export const ERP_DEF: Record<ErpKind, { label: string; codePh: string; fields: ErpField[] }> = {
  department: { label: "Department Std. · 부서", codePh: "D100", fields: [
    { key: "parent", label: "상위 부서", type: "text", ref: "department" },
    { key: "manager", label: "부서장", type: "text", max: 60 },
  ] },
  warehouse: { label: "Warehouse · 창고", codePh: "W01", fields: [
    { key: "location", label: "위치", type: "text", max: 120 },
  ] },
  inventory: { label: "Inventory · 재고", codePh: "INV-001", fields: [
    { key: "warehouse", label: "창고", type: "text", ref: "warehouse", required: true },
    { key: "item", label: "품목 코드", type: "text", max: 60 },
    { key: "qty", label: "수량", type: "number", required: true },
    { key: "unit", label: "단위", type: "text", max: 12 },
  ] },
  bank: { label: "Bank · 거래 은행", codePh: "B01", fields: [
    { key: "branch", label: "지점", type: "text", max: 60 },
    { key: "account", label: "계좌", type: "text", max: 40 },
    { key: "nation", label: "국가", type: "text", ref: "nation" },
  ] },
  employee: { label: "Employee · 직원", codePh: "E001", fields: [
    { key: "department", label: "부서", type: "text", ref: "department", required: true },
    { key: "title", label: "직책", type: "text", max: 40 },
    { key: "email", label: "이메일", type: "text", max: 120 },
  ] },
  nation: { label: "Nation · 국가", codePh: "KR", fields: [
    { key: "currency", label: "통화", type: "text", max: 3 },
  ] },
};

export type ErpAttrs = Record<string, string | number>;

/** 들어온 attrs 를 정의대로 다듬는다. 정의 밖 칸은 버린다. 참조가 실제로 있는지는 호출한 쪽(DB)이 본다. */
export function normalizeAttrs(kind: ErpKind, raw: unknown): { ok: true; attrs: ErpAttrs } | { ok: false; error: string } {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: ErpAttrs = {};
  for (const f of ERP_DEF[kind].fields) {
    const v = src[f.key];
    if (f.type === "number") {
      if (v === undefined || v === null || v === "") { if (f.required) return { ok: false, error: `${f.label} 필수` }; continue; }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1e12) return { ok: false, error: `${f.label}은(는) 0 이상의 수` };
      out[f.key] = n;
    } else {
      const s = typeof v === "string" ? v.trim().slice(0, f.max ?? 40) : typeof v === "number" ? String(v) : "";
      if (!s) { if (f.required) return { ok: false, error: `${f.label} 필수` }; continue; }
      out[f.key] = s;
    }
  }
  if (kind === "nation" && typeof out.currency === "string" && !/^[A-Z]{3}$/.test(out.currency)) return { ok: false, error: "통화는 대문자 세 글자(KRW · USD …)" };
  if (kind === "employee" && typeof out.email === "string" && !/^[^\s@]+@[^\s@]+$/.test(out.email)) return { ok: false, error: "이메일 형식이 아닙니다" };
  return { ok: true, attrs: out };
}

/** 이 attrs 가 가리키는 (kind, code) 목록 — 존재·사용 중 여부를 DB 에서 확인할 대상. */
export function refsOf(kind: ErpKind, attrs: ErpAttrs): { field: ErpField; kind: ErpKind; code: string }[] {
  return ERP_DEF[kind].fields
    .filter((f) => f.ref && typeof attrs[f.key] === "string" && attrs[f.key] !== "")
    .map((f) => ({ field: f, kind: f.ref!, code: attrs[f.key] as string }));
}

/** (kind, code) 행을 가리키는 칸들 — 삭제 409 판정용. 예: department → employee.department · department.parent */
export function referrersOf(kind: ErpKind): { kind: ErpKind; key: string }[] {
  const out: { kind: ErpKind; key: string }[] = [];
  for (const k of ERP_KINDS) for (const f of ERP_DEF[k].fields) if (f.ref === kind) out.push({ kind: k, key: f.key });
  return out;
}

/** 상위 부서를 따라 올라가다 자기 자신을 만나면 순환. parents = code → parent code. */
export function makesCycle(code: string, parent: string | undefined, parents: Map<string, string | undefined>): boolean {
  const seen = new Set<string>([code]);
  let cur = parent;
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = parents.get(cur);
  }
  return false;
}
