import { getServerSession } from "@/app/lib/session";
import { canEditMes, SAMPLE_NOTE } from "@/app/lib/mes-run";
import { Shell, Warehouse } from "../mes-screens";

/** ccmd L · LA4 · p44-4 창고 · 재고 — 입출고는 추가만 · 현재고 = 기록 합 · 재고 단가 최고 · 최저 · 평균 · 최근 · Min Stack 경고 · 음수 재고 409 */
export default async function WarehousePage() {
  const s = (await getServerSession())!;
  return <Shell testid="warehouse" title="창고 · 재고 (p44)" sub={<>입출고는 추가만 되는 기록(고치기 · 지우기 없음) · 현재고 = 기록 합 · 출고로 음수가 되면 거부. {SAMPLE_NOTE}.</>}><Warehouse canEdit={canEditMes(s.role)} /></Shell>;
}
