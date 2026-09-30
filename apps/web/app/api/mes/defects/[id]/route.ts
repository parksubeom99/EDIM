import { NextResponse, type NextRequest } from "next/server";
import { withTenant, advanceDefect } from "@edim/db";
import { editorOr403, mesError } from "../../_util";
import { UUID_RE } from "@/app/lib/mes-run";

/** ccmd L · LA5 — 하자 건 상태: 열림 → 조치 → 닫힘(앞으로만 · 변경마다 로그 추가) · 다른 회사 404 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.to !== "action" && b.to !== "closed") return NextResponse.json({ error: "to = action | closed" }, { status: 400 });
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 200) : "";
  try {
    return NextResponse.json({ ok: true, ...(await withTenant(a.s.tenantId, (tx) => advanceDefect(tx, id, b.to as string, note, a.s.userId))) });
  } catch (e) { return mesError(e); }
}
