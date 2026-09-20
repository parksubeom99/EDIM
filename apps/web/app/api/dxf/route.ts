import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { dxfSourceFromRun } from "@/app/lib/output/drawing-source";
import { buildPlanDxf, buildAssemblyDxf } from "@/app/lib/output/dxf";

/**
 * GET ?runId=<BOM 스냅샷>&type=plan|assembly → DXF R12 파일.
 *
 * P4-a 이전에는 슬롯만으로 그렸고 치수는 샘플 상수였다. 이제 **스냅샷이 필수**다 —
 * 도면은 "그때 그 BOM"의 그림이어야 하기 때문이다. meta=1 이면 파일 대신 요약을 준다.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const runId = q.get("runId") ?? "";
  const type = q.get("type") === "assembly" ? "assembly" : "plan";
  if (!runId)
    return NextResponse.json(
      { error: "runId 필요 — 도면은 BOM 스냅샷에서 나옵니다. 먼저 BOM Run 을 실행하세요." },
      { status: 400 },
    );

  const src = await dxfSourceFromRun(session.tenantId, runId);
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });

  const { dxf, meta } = type === "assembly" ? buildAssemblyDxf(src.input) : buildPlanDxf(src.input);
  if (q.get("meta") === "1") return NextResponse.json({ code: src.run.code, runId, ...meta });
  return new NextResponse(dxf, {
    headers: {
      "content-type": "application/dxf",
      "content-disposition": `attachment; filename="edim-${src.run.code}-${type}.dxf"`,
    },
  });
}
