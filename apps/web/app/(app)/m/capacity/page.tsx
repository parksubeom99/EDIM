import { getServerSession } from "@/app/lib/session";
import { canEditMes, SAMPLE_NOTE } from "@/app/lib/mes-run";
import { Shell, Capacity } from "../mes-screens";

/** ccmd L · LA3 · p44-3 Capacity — 작업장별 · 날짜별 부하(지시된 단계 시간 × 수량 × 인원) vs 가용 시간 → 초과면 빨간 칸 */
export default async function CapacityPage() {
  await getServerSession();
  return <Shell testid="capacity" title="Capacity · 작업장 부하 (p44)" sub={<>지시된 단계(완료 전)를 착수일부터 순서대로 날에 앉힌다(8h/일) · 부하 &gt; 가용이면 빨간 칸. {SAMPLE_NOTE}.</>}><Capacity /></Shell>;
}
