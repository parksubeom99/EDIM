import { NextResponse, type NextRequest } from "next/server";
import { withTenant, listSpecialGrants, fanCandidates, tenantFanCurves, insertSpecialRun } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { selectFan, bracketOf, validateFanInput, type FanSegment } from "@/app/lib/special/fan";

/**
 * C · Special '팬 선정' 실행 — 서버 결정론 계산(LLM 0). 부여(grant)가 있는 회사만 · viewer 403(실행 = 과금이라 편집 권한).
 * 바인딩 지도(어디서 가져오나):
 *   source=platform — DB① 팬 성능표를 **special_fan_candidates() 함수로** — 교점을 품은 구간만(곡선 원자료는 안 온다)
 *   source=tenant   — 이 회사가 등록한 tenant_fan_curve 전체
 * 결과가 있든 없든 사용 기록 1행(불변) — 적합한 팬이 없으면 요금 0.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(s.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { inputs?: Record<string, unknown>; source?: unknown };
  const i = b.inputs ?? {};
  const input = { qCmh: Number(i.q_cmh), pPa: Number(i.p_pa), rho: i.rho === undefined || i.rho === "" || i.rho === null ? 1.2 : Number(i.rho) };
  const bad = validateFanInput(input);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const source = b.source === "tenant" ? "tenant" : "platform";
  const out = await withTenant(s.tenantId, async (tx) => {
    const grant = (await listSpecialGrants(tx)).find((g) => g.programKey === "fan-select");
    if (!grant) return { status: 403, body: { error: "Special '팬 선정' 권한이 없습니다 — 플랫폼에 의뢰하십시오" } };
    let segs: FanSegment[];
    let fetched: string;
    if (source === "platform") {
      segs = await fanCandidates(tx, input.qCmh, input.pPa);
      fetched = `DB① platform.fan_curve · 열 q_cmh · p_pa · eta · 조건: 모델·회전수마다 계통 곡선(k = ${input.pPa}/${input.qCmh}²)과의 교점을 품은 구간 1개 — special_fan_candidates()`;
    } else {
      const curves = await tenantFanCurves(tx);
      if (curves.length === 0) return { status: 409, body: { error: "회사 자체 팬 표(tenant_fan_curve)가 비어 있습니다" } };
      const k = input.pPa / (input.qCmh * input.qCmh);
      segs = curves.map((c) => ({ model: c.model, rpm: c.rpm, ...bracketOf(c.points, k) }));
      fetched = `회사 tenant_fan_curve · 열 q_cmh · p_pa · eta · 조건: 이 회사가 등록한 팬 표 전체(${curves.length}곡선)`;
    }
    const result = selectFan(input, segs);
    const price = result.ok ? grant.pricePerRun : 0;
    const runId = await insertSpecialRun(tx, {
      tenantId: s.tenantId, programKey: "fan-select", version: grant.version, input: { ...input, source },
      result: { ...result, sample: source === "platform" ? "샘플 성능표 기준" : "회사 자체 표(샘플) 기준" }, bindingSource: source, price, currency: grant.currency, createdBy: s.userId,
    });
    return { status: 200, body: { runId, result, price, currency: grant.currency, source, fetched, sampleNote: "샘플 성능표 기준 — 실제 제조사 자료 아님" } };
  });
  return NextResponse.json(out.body, { status: out.status });
}
