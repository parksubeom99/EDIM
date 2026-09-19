import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { assembleCode, type SlotValues } from "@/app/lib/rccs";
import { loadSlotDefs } from "@/app/lib/catalog";
import { buildDxf } from "@/app/lib/output/dxf";

/** GET ?A=EU&B=55&C=2123&D=&E=&F= → DXF R12 file download of the plan view. */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const slots: SlotValues = {};
  for (const k of ["A", "B", "C", "D", "E", "F"] as const) { const v = q.get(k); if (v) slots[k] = v; }
  const a = assembleCode(slots, await loadSlotDefs(session.tenantId));
  if (!a.ok) return NextResponse.json({ error: "invalid code", diagnostics: a.diagnostics }, { status: 400 });
  const { dxf, meta } = buildDxf(slots, a.code);
  if (q.get("meta") === "1") return NextResponse.json({ code: a.code, ...meta });
  return new NextResponse(dxf, {
    headers: { "content-type": "application/dxf", "content-disposition": `attachment; filename="edim-${a.code}.dxf"` },
  });
}
