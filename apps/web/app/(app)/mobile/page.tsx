import { withTenant, listApprovals } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditMes } from "@/app/lib/mes-run";
import { canDecideApproval } from "@/app/lib/project-perms";
import { businessToday } from "@/app/lib/today";
import { Mobile } from "../m/mes-screens";

/** ccmd L · LA7 · p69 모바일 업무(폭 390 우선 · 같은 로그인 · 같은 권한) — 승인(기존 프로젝트 승인) · 대화(기존 활동 기록) · 입출고 · 검수 · 공지 */
export const viewport = { width: "device-width", initialScale: 1 };
export default async function MobilePage() {
  const s = (await getServerSession())!;
  const d = await withTenant(s.tenantId, async (tx) => {
    const ps = await tx.project.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, projectNo: true, name: true } });
    const apv = [];
    for (const p of ps) for (const a of await listApprovals(tx, p.id)) if (a.state === "requested") apv.push({ id: a.id, projectNo: p.projectNo, code: a.bomRun?.code ?? null });
    return { ps, apv };
  });
  return <Mobile canEdit={canEditMes(s.role)} canDecide={canDecideApproval(s.role)} isOwner={s.role === "owner"} today={businessToday()} projects={d.ps} approvals={d.apv} />;
}
