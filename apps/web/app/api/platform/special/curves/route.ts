import { NextResponse, type NextRequest } from "next/server";
import { platformUpdateFanPoint } from "@edim/db";
import { requirePlatform } from "../../learning/_auth";

/**
 * ccmd K · KA — 플랫폼이 DB① 팬 성능표(샘플)의 점 하나를 고친다(성능표 개정).
 * 회사 계정은 403(requirePlatform) · 없는 점은 404 · 값 범위 밖은 400.
 * 개정 뒤 새 BOM Run 만 새 곡선을 읽는다 — 앞 스냅샷의 dims.special 은 그대로(0011 원칙 · e2e S75d).
 */
export async function POST(req: NextRequest) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const b = (await req.json().catch(() => ({}))) as { model?: unknown; rpm?: unknown; q?: unknown; p?: unknown; eta?: unknown };
  const model = typeof b.model === "string" ? b.model : "";
  const rpm = Number(b.rpm), q = Number(b.q), p = Number(b.p), eta = Number(b.eta);
  if (!model || !Number.isInteger(rpm) || !Number.isFinite(q) || !Number.isFinite(p) || p <= 0 || !Number.isFinite(eta) || eta <= 0 || eta >= 1)
    return NextResponse.json({ error: "model · rpm(정수) · q · p(>0) · eta(0~1) 필요" }, { status: 400 });
  const n = await platformUpdateFanPoint({ model, rpm, q, p, eta });
  if (n === 0) return NextResponse.json({ error: "그 점이 성능표에 없습니다(model · rpm · q 일치)" }, { status: 404 });
  return NextResponse.json({ ok: true, updated: n, model, rpm, q, p, eta });
}
