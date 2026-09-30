import { getServerSession } from "@/app/lib/session";
import { canEditMes, SAMPLE_NOTE } from "@/app/lib/mes-run";
import { Shell, Quality } from "../mes-screens";

/** ccmd L · LA5 · p44-5 품질 — 검수(자재 · 완성품 · 설치완료 · 추가만) · 불합격 → 하자 건(열림 → 조치 → 닫힘) · 자재 불합격 → 반품 이동 · A/S(p69-5) */
export default async function QualityPage() {
  const s = (await getServerSession())!;
  return <Shell testid="quality" title="품질 · 검수 · 하자 (p44)" sub={<>검수는 추가만 되는 기록(사진 없이 메모). 작업지시 마지막 공정 완료에는 완성품 검수 합격이 있어야 한다.</>}><Quality canEdit={canEditMes(s.role)} /></Shell>;
}
