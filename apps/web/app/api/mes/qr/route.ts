import { NextResponse, type NextRequest } from "next/server";
import { withTenant, qrTokenFor, revokeQrToken, findQrToken } from "@edim/db";
import { editorOr403 } from "../_util";
import { UUID_RE, qrSvg } from "@/app/lib/mes-run";

/**
 * ccmd L · LA7 · p69 — QR 토큰. POST {kind: project | work_order | drawing, id} → 대상마다 살아 있는 토큰 하나(추측 불가 임의값) · URL · SVG.
 * POST {revoke: 토큰} → 폐기(이후 /q/{토큰} 410). 대상은 이 회사에 보여야 한다(다른 회사 id = 404).
 */
export async function POST(req: NextRequest) {
  const a = await editorOr403(); if ("res" in a) return a.res;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.revoke === "string") {
    const ok = await withTenant(a.s.tenantId, async (tx) => {
      const t = await findQrToken(tx, b.revoke as string);
      if (!t) return false;
      await revokeQrToken(tx, t.id); return true;
    });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const kind = b.kind === "project" || b.kind === "work_order" || b.kind === "drawing" ? b.kind : null;
  const id = typeof b.id === "string" && UUID_RE.test(b.id) ? b.id : null;
  if (!kind || !id) return NextResponse.json({ error: "kind(project|work_order|drawing) · id" }, { status: 400 });
  const t = await withTenant(a.s.tenantId, async (tx) => {
    const seen = kind === "project" ? await tx.project.findUnique({ where: { id } }) : kind === "work_order" ? await tx.workOrder.findUnique({ where: { id } }) : await tx.drawing.findUnique({ where: { id } });
    if (!seen) return null;
    return qrTokenFor(tx, kind, id, a.s.userId);
  });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = `${req.nextUrl.origin}/q/${t.token}`;
  return NextResponse.json({ ok: true, token: t.token, url, svg: qrSvg(url, 4) });
}
