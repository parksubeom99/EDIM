import { NextResponse, type NextRequest } from "next/server";
import { withTenant, workOrderDetail, qrTokenFor } from "@edim/db";
import { sessionOr401 } from "../../../_util";
import { UUID_RE, workOrderHtml, canEditMes, publicOrigin } from "@/app/lib/mes-run";
import { processCostFor } from "@/app/lib/process-cost";

/** ccmd L · LA3 · LA7 — 작업지시서 A4 인쇄본(기존 인쇄본 방식 = HTML → 브라우저 인쇄/PDF) · QR 칸(/q/{토큰}). 다른 회사 404. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const out = await withTenant(a.s.tenantId, async (tx) => {
    const d = await workOrderDetail(tx, id);
    if (!d) return null;
    const p = await tx.project.findUnique({ where: { id: d.projectId }, select: { projectNo: true } });
    // QR 토큰은 쓰기 역할만 새로 만든다 — viewer 는 이미 있는 토큰만 보인다(없으면 QR 칸 비움)
    const t = canEditMes(a.s.role) ? await qrTokenFor(tx, "work_order", id, a.s.userId) : await tx.qrToken.findFirst({ where: { targetKind: "work_order", targetId: id, revokedAt: null } });
    return { d, projectNo: p?.projectNo ?? "—", token: t?.token ?? null, pc: await processCostFor(tx, d) };
  });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = out.token ? `${publicOrigin(req)}/q/${out.token}` : null;
  return new NextResponse(workOrderHtml(out.d, out.projectNo, url, out.pc), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
