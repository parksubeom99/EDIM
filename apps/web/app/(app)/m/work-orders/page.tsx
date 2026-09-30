import { getServerSession } from "@/app/lib/session";
import { canEditMes, SAMPLE_NOTE } from "@/app/lib/mes-run";
import { Shell, WorkOrders } from "../mes-screens";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** ccmd L · LA3 · p44-2 · 3 작업지시 · 공정 진행 — 앞 공정 미완료면 다음 착수 409 · 마지막 공정 완료에는 완성품 검수 합격 · A4 작업지시서(QR) */
export default async function WorkOrdersPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const s = (await getServerSession())!;
  const id = (await searchParams).id;
  return <Shell testid="work-orders" title="작업지시 · 공정 진행 (p44)" sub={<>공정 순서는 지시 순간의 사본 · 착수 · 완료는 추가만 되는 기록(되돌리기 없음). {SAMPLE_NOTE}.</>}><WorkOrders canEdit={canEditMes(s.role)} initial={id && UUID.test(id) ? id : null} /></Shell>;
}
