import { NextResponse, type NextRequest } from "next/server";
import { withTenant, saveDocument, listDocuments, isDocumentType } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { businessToday } from "@/app/lib/today";
import { canEditProject } from "@/app/lib/project-perms";
import { documentSourceFromRun } from "@/app/lib/output/document-source";
import { buildQuotationBody, buildTechDataBody, noCoreOf, resolveInputData, type InputDataValue } from "@/app/lib/output/document";

/** GET = 문서 목록 · POST = BOM 스냅샷에서 견적(p66)·Tech Data(p15~16)를 떠서 남긴다. */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const node = req.nextUrl.searchParams.get("node");
  const rows = await withTenant(session.tenantId, (tx) => listDocuments(tx, node));
  return NextResponse.json({ rows });
}

const str = (v: unknown, max = 80): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canEditProject(session.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const runId = typeof b.runId === "string" ? b.runId : "";
  if (!runId) return NextResponse.json({ error: "runId 필요 — 문서는 BOM 스냅샷에서 나옵니다" }, { status: 400 });
  if (!isDocumentType(b.type))
    return NextResponse.json({ error: "type 필요 (quotation|techdata)" }, { status: 400 });
  const type = b.type;

  const src = await documentSourceFromRun(session.tenantId, runId);
  if (!src.ok) return NextResponse.json({ error: src.error }, { status: src.status });

  // 0022 · p16 Input Data 템플릿 — Tech Data 는 회사가 정한 입력 항목 값을 받아 body 에 스냅샷으로 넣는다.
  let inputData: InputDataValue[] = [];
  if (type === "techdata") {
    const defs = await withTenant(session.tenantId, (tx) => tx.inputItem.findMany({ where: { docType: "techdata" }, orderBy: [{ seq: "asc" }, { createdAt: "asc" }] }));
    const r = resolveInputData(defs.map((d) => ({ key: d.key, label: d.label, unit: d.unit, defaultValue: d.defaultValue, minValue: d.minValue, maxValue: d.maxValue })), b.inputData);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    inputData = r.values;
  }

  // 본문을 먼저 한 번 만들어 본다 — 거부할 스냅샷이면 번호를 쓰기 전에 돌려보낸다.
  const date = businessToday();   // 문서 날짜 = 회사 시간대의 오늘
  const opts = {
    ...(typeof b.qty === "number" ? { qty: b.qty } : {}),
    deliveryTerms: str(b.deliveryTerms), paymentTerms: str(b.paymentTerms),
    validity: str(b.validity), warranty: str(b.warranty),
  };
  const make = (docNo: string, rev: string) =>
    type === "quotation"
      ? buildQuotationBody(src.run, src.project, opts, docNo, rev, date)
      : buildTechDataBody(src.run, src.project, docNo, rev, date, inputData);
  const probe = make("-", "-");
  if (!probe.ok) return NextResponse.json({ error: probe.error }, { status: probe.status });

  const noPrefix = `${type === "quotation" ? "QR" : "TD"}-${noCoreOf(src.project?.projectNo)}`;
  const row = await withTenant(session.tenantId, (tx) =>
    saveDocument(tx, {
      stableId: src.run.stableId, bomRunId: runId, docType: type, noPrefix, code: src.run.code,
      body: (docNo, rev) => {
        const r = make(docNo, rev);
        if (!r.ok) throw new Error(r.error); // probe 를 통과했으므로 오지 않는다
        return r.body;
      },
      createdBy: session.userId,
    }),
  );
  const body = row.body as { total?: number; output?: { value: number } };
  return NextResponse.json({
    ok: true, id: row.id, docNo: row.docNo, rev: row.currentRev, status: row.status, type: row.docType,
    total: body.total ?? null, value: body.output?.value ?? null,
    message: `${type === "quotation" ? "견적" : "Tech Data"} ${row.docNo} Rev ${row.currentRev} 생성 · 스냅샷 ${runId.slice(0, 8)}`,
  });
}
