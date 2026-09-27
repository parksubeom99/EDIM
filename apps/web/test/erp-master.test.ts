import { describe, it, expect } from "vitest";
import { normalizeAttrs, refsOf, referrersOf, makesCycle, ERP_KINDS, ERP_DEF } from "../app/lib/erp-master";

/** H4 · p64 ERP 기준정보 — 칸 정의 한 곳 · 값 검사 · 가리키는 관계 */
describe("H4 ERP 기준정보 — 칸 검사", () => {
  it("여섯 종류가 청사진 p64 그대로다", () => {
    expect([...ERP_KINDS]).toEqual(["department", "warehouse", "inventory", "bank", "employee", "nation"]);
    for (const k of ERP_KINDS) expect(ERP_DEF[k].label.length).toBeGreaterThan(0);
  });
  it("필수 칸이 비면 거부 · 정의 밖 칸은 버린다 · 수는 수로", () => {
    expect(normalizeAttrs("employee", {})).toEqual({ ok: false, error: "부서 필수" });
    expect(normalizeAttrs("inventory", { warehouse: "W01" })).toEqual({ ok: false, error: "수량 필수" });
    expect(normalizeAttrs("inventory", { warehouse: " W01 ", qty: "12", junk: "x" })).toEqual({ ok: true, attrs: { warehouse: "W01", qty: 12 } });
    expect(normalizeAttrs("inventory", { warehouse: "W01", qty: -1 }).ok).toBe(false);
  });
  it("통화는 대문자 세 글자 · 이메일은 형식", () => {
    expect(normalizeAttrs("nation", { currency: "KRW" }).ok).toBe(true);
    expect(normalizeAttrs("nation", { currency: "won" }).ok).toBe(false);
    expect(normalizeAttrs("employee", { department: "D1", email: "a@b" }).ok).toBe(true);
    expect(normalizeAttrs("employee", { department: "D1", email: "nope" }).ok).toBe(false);
  });
});

describe("H4 ERP 기준정보 — 가리키는 관계", () => {
  it("attrs 가 가리키는 (종류, 코드)", () => {
    expect(refsOf("employee", { department: "D100", title: "과장" }).map((r) => [r.kind, r.code])).toEqual([["department", "D100"]]);
    expect(refsOf("bank", { branch: "강남" })).toEqual([]);
  });
  it("누가 이 종류를 가리키나 — 삭제 409 판정의 근거", () => {
    expect(referrersOf("department")).toEqual([{ kind: "department", key: "parent" }, { kind: "employee", key: "department" }]);
    expect(referrersOf("warehouse")).toEqual([{ kind: "inventory", key: "warehouse" }]);
    expect(referrersOf("nation")).toEqual([{ kind: "bank", key: "nation" }]);
    expect(referrersOf("employee")).toEqual([]);
  });
  it("상위 부서 순환을 잡는다", () => {
    const parents = new Map<string, string | undefined>([["D100", undefined], ["D200", "D100"], ["D300", "D200"]]);
    expect(makesCycle("D400", "D300", parents)).toBe(false);
    expect(makesCycle("D100", "D300", parents)).toBe(true);
    expect(makesCycle("D100", undefined, parents)).toBe(false);
  });
});
