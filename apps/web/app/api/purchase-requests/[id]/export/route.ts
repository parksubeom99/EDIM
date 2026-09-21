import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getPurchaseRequest } from "@edim/db";
import { getServerSession } from "@/app/lib/session";
import { prToCsv } from "@/app/lib/output/document";

/** 구매 요청 Export — CSV(엑셀에서 바로 열린다). 열 순서는 p51 BOM List. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const pr = await withTenant(session.tenantId, (tx) => getPurchaseRequest(tx, id)).catch(() => null);
  if (!pr) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(prToCsv(pr), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${pr.prNo}.csv"`,
      "cache-control": "no-store",
    },
  });
}
