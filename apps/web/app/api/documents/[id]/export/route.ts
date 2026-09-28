import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { canEditProject } from "@/app/lib/project-perms";
import { loadPrintable } from "@/app/lib/output/printable";
import { sectionsOf, toDocx, toXlsx } from "@/app/lib/output/office";

const TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/**
 * E7 · p48 "File 내보내기(Office)" — GET /api/documents/:id/export?format=docx|xlsx
 * 인쇄본과 같은 스냅샷 body 를 그대로 옮긴다(다시 계산 없음). 인쇄 양식이 있으면 양식 순서.
 * 파일로 밖에 나가는 것이라 viewer 는 403 · 다른 회사 문서는 404 · 모르는 format 은 400.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const format = req.nextUrl.searchParams.get("format") ?? "";
  if (format !== "docx" && format !== "xlsx") return NextResponse.json({ error: "format 은 docx 또는 xlsx" }, { status: 400 });
  if (!canEditProject(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const out = await loadPrintable(session.tenantId, id, { drawing: false });
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sections = sectionsOf(out.row, out.layout?.elements);
  const buf = format === "docx" ? await toDocx(out.row, sections) : await toXlsx(out.row, sections);
  const kind = (out.row.body as { kind?: string }).kind === "quotation" ? "견적서" : "TechData";
  const name = `${out.row.docNo}_Rev${out.row.currentRev}_${kind}.${format}`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": TYPES[format],
      "content-disposition": `attachment; filename="${out.row.docNo}.${format}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "no-store",
    },
  });
}
