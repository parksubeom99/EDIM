import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { dxfSourceFromRun } from "@/app/lib/output/drawing-source";
import { UUID } from "../setup/_guard";

/**
 * ⑩ 3D 뷰어의 데이터 (청사진 p4 DWG 3D · p37). 새 데이터 없음 — 도면과 **같은 입구**(BOM 스냅샷 → dxfSourceFromRun)에서
 * 구획 박스(길이 × 폭 × 높이)를 꺼낸다. 설계 검증 위반 스냅샷은 도면처럼 거부(422)한다.
 * GET ?runId= → { code, dims: {W,H,L}, boxes: [{ name, x, len, dir?, components? }], length }
 * 아직 없음: glTF 내보내기 · 실제 부품 형상(지금은 구획 박스와 부품 칸 표시뿐).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const runId = req.nextUrl.searchParams.get("runId") ?? "";
  if (!UUID.test(runId)) return NextResponse.json({ error: "runId 필요 — 3D 는 BOM 스냅샷에서 나옵니다" }, { status: 400 });
  const src = await dxfSourceFromRun(session.tenantId, runId);
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });
  const { W, H, L } = src.input.dims;
  type Sec = { name: string; len: number; dir?: string; components?: { code: string; at: string; level: string }[] };
  const secs: Sec[] = src.input.secDims && src.input.secDims.length > 0
    ? src.input.secDims
    : (src.input.sections.length > 0 ? src.input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  let x = 0;
  const boxes = secs.map((s) => {
    const b = { name: s.name, x, len: s.len, ...(s.dir ? { dir: s.dir } : {}), ...(s.components ? { components: s.components } : {}) };
    x += s.len;
    return b;
  });
  return NextResponse.json({ code: src.input.code, runId, dims: { W, H, L }, boxes, length: x });
}
