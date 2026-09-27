import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@edim/db";
import { businessDateOf } from "@/app/lib/today";
import { guard } from "../setup/_guard";

/**
 * F7 · p15 Technical data 목록 — Tech Data 문서를 스냅샷별로 모아 본다(읽기만 · 문서 body 를 다시 계산하지 않는다).
 * GET ?status=draft|review|approved|issued &q=(문서번호·코드 일부) → { rows: [{ docNo, rev, status, code, runId, date, inputData, output, project }] }
 */
const STATUSES = ["draft", "review", "approved", "issued"];

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? "", q = (sp.get("q") ?? "").trim().slice(0, 60);
  if (status && !STATUSES.includes(status)) return NextResponse.json({ error: `status 는 ${STATUSES.join("|")}` }, { status: 400 });
  const docs = await withTenant(g.session.tenantId, (tx) => tx.document.findMany({
    where: {
      docType: "techdata",
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ docNo: { contains: q } }, { code: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, docNo: true, currentRev: true, status: true, code: true, bomRunId: true, createdAt: true, body: true },
  }));
  return NextResponse.json({
    rows: docs.map((d) => {
      const b = (d.body ?? {}) as { date?: string; inputData?: { key: string; label: string; unit: string; value: number }[]; output?: { name: string; value: number }; project?: { projectNo?: string } | null };
      return { id: d.id, docNo: d.docNo, rev: d.currentRev, status: d.status, code: d.code, runId: d.bomRunId, date: b.date ?? businessDateOf(d.createdAt),
        inputData: b.inputData ?? [], output: b.output ?? null, projectNo: b.project?.projectNo ?? null };
    }),
  });
}
