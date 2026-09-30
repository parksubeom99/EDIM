import { NextResponse, type NextRequest } from "next/server";
import { withTenant, listQuality, addInspection, openDefect } from "@edim/db";
import { sessionOr401, editorOr403, mesError, str } from "../_util";
import { UUID_RE } from "@/app/lib/mes-run";

/**
 * ccmd L · LA5 · p44-5 — 품질. GET 검수 · 하자 목록. POST {kind: "inspection", target: material|product|install, refId, itemCode?, result: pass|fail, memo}
 * (추가만 · 자재 불합격 → 그 입고 수량 반품 이동 자동 · 불합격 → 하자 건 열림) · {kind: "as", refId(설치완료 검수 id), title} A/S 건(p69-5).
 */
export async function GET() {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  return NextResponse.json(await withTenant(a.s.tenantId, (tx) => listQuality(tx)));
}

export async function POST(req: NextRequest) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const refId = typeof b.refId === "string" && UUID_RE.test(b.refId) ? b.refId : null;
  try {
    if (b.kind === "as") {
      const t = str(b.title, 100);
      if (!refId || !t) return NextResponse.json({ error: "refId(설치완료 검수) · title" }, { status: 400 });
      const out = await withTenant(a.s.tenantId, async (tx) => {
        const i = await tx.inspection.findUnique({ where: { id: refId } });
        if (!i || i.target !== "install") return null;
        return openDefect(tx, { kind: "as", inspectionId: i.id, refId: i.refId, title: `A/S — ${t}`, createdBy: a.s.userId });
      });
      if (!out) return NextResponse.json({ error: "설치완료 검수를 찾을 수 없습니다" }, { status: 404 });
      return NextResponse.json({ ok: true, defectId: out.id });
    }
    const target = b.target === "material" || b.target === "product" || b.target === "install" ? b.target : null;
    const result = b.result === "pass" || b.result === "fail" ? b.result : null;
    if (b.kind !== "inspection" || !target || !result || !refId) return NextResponse.json({ error: "kind=inspection · target(material|product|install) · refId · result(pass|fail)" }, { status: 400 });
    const memo = typeof b.memo === "string" ? b.memo.trim().slice(0, 200) : "";
    const r = await withTenant(a.s.tenantId, (tx) => addInspection(tx, { target, refId, itemCode: str(b.itemCode, 40), result, memo, createdBy: a.s.userId }));
    return NextResponse.json({ ok: true, inspectionId: r.inspection.id, returned: r.returned, defectId: r.defect?.id ?? null });
  } catch (e) { return mesError(e); }
}

const noEdit = () => NextResponse.json({ error: "검수는 추가만 되는 기록입니다 — 고치기 · 지우기 없음" }, { status: 405 });
export const PATCH = noEdit;
export const DELETE = noEdit;
