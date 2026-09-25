import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getPrintSetup, savePrintSetup, isPrintDocType, parsePrintSettings, PAPERS, FONTS } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";

/**
 * p48 Print Set-up Form. GET ?type=quotation|techdata → 설정(저장 없으면 기본값) + 고를 수 있는 값.
 * PUT { type, settings } → 검증(틀린 필드 이름으로 400) 후 저장. 편집 역할만.
 * Print Test 용으로 그 종류의 가장 최근 문서 id 도 준다(없으면 null — 문서를 먼저 만들어야 미리 볼 수 있다).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const type = new URL(req.url).searchParams.get("type");
  if (!isPrintDocType(type)) return NextResponse.json({ error: "type 은 quotation · techdata" }, { status: 400 });
  const out = await withTenant(session.tenantId, async (tx) => {
    const s = await getPrintSetup(tx, type);
    const latest = await tx.document.findFirst({ where: { docType: type }, orderBy: { createdAt: "desc" }, select: { id: true, docNo: true, currentRev: true } });
    return { ...s, sample: latest };
  });
  return NextResponse.json({ type, ...out, choices: { papers: PAPERS, fonts: FONTS } });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { type?: unknown; settings?: unknown };
  if (!isPrintDocType(b.type)) return NextResponse.json({ error: "type 은 quotation · techdata" }, { status: 400 });
  const p = parsePrintSettings(b.settings);
  if (!p.ok) return NextResponse.json({ error: `값이 허용 범위 밖입니다: ${p.field}` }, { status: 400 });
  const type = b.type;
  await withTenant(session.tenantId, (tx) => savePrintSetup(tx, type, p.settings, session.userId));
  return NextResponse.json({ ok: true, settings: p.settings });
}
