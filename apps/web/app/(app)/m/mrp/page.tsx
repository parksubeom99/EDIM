import { getServerSession } from "@/app/lib/session";
import { canEditMes, SAMPLE_NOTE } from "@/app/lib/mes-run";
import { withTenant } from "@edim/db";
import { Shell, Mrp } from "../mes-screens";

/** ccmd L · LA2 · p44-1 MRP — 프로젝트(수량 · 납기)의 BOM 스냅샷 → 총소요 · 순소요 · 시기 → 구매 요청 초안 · 작업지시 초안 */
export default async function MrpPage() {
  const s = (await getServerSession())!;
  const ps = await withTenant(s.tenantId, (tx) => tx.project.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, projectNo: true, name: true, qty: true, dueDate: true } }));
  return <Shell testid="mrp" title="MRP · 소요량과 시기 (p44)" sub={<>MRP 는 BOM 스냅샷을 읽기만 한다. 구매 품목 → 기존 구매 요청(초안) · 제조 품목 → 작업지시 초안. {SAMPLE_NOTE}.</>}>
    <Mrp canEdit={canEditMes(s.role)} projects={ps.map((p) => ({ id: p.id, projectNo: p.projectNo, name: p.name, qty: p.qty, due: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null }))} /></Shell>;
}
