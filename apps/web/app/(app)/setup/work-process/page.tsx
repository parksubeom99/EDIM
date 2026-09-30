import { getServerSession } from "@/app/lib/session";
import { canEditMes, SAMPLE_NOTE } from "@/app/lib/mes-run";
import { Shell, WorkProcess } from "../../m/mes-screens";

/** ccmd L · LA1 · p43 Work Process(All Department) — Material 표 · Process 표 + 기준정보(작업장 · 기계 · 작업자 · 창고). 원가 계산은 이 표를 읽지 않는다. */
export default async function WorkProcessPage() {
  const s = (await getServerSession())!;
  return <Shell testid="work-process" title="Work Process · All Department (p43)" sub={<>Material(Item · warehouse · Min Stack · 공급자 · 제조/구매 · Time) · Process(Assembling · Work shop · Person · Skill · W. Time). {SAMPLE_NOTE}. 원가(제조비)는 이 표를 읽지 않는다 — 제조 정보 표(F10)만.</>}><WorkProcess canEdit={canEditMes(s.role)} /></Shell>;
}
