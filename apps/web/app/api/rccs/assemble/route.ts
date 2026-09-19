import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/app/lib/session";
import { assembleCode, type SlotValues } from "@/app/lib/rccs";
import { loadSlotDefs } from "@/app/lib/catalog";

/** Server-side RCCS assembly + rule validation (authority stays server-side). */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { slots?: unknown };
  const slots = (body.slots && typeof body.slots === "object"
    ? body.slots
    : {}) as SlotValues;
  return NextResponse.json(assembleCode(slots, await loadSlotDefs(session.tenantId)));
}
