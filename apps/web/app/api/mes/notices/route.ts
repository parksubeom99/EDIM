import { NextResponse, type NextRequest } from "next/server";
import { withTenant, addNotice, listNotices } from "@edim/db";
import { sessionOr401, str } from "../_util";
import { canWriteNotice } from "@/app/lib/mes-run";

/** ccmd L · LA7 · p69-7 — 회사 공지(추가만). 읽기 = 회사 사람 전부 · 쓰기 = owner */
export async function GET() {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  return NextResponse.json({ rows: await withTenant(a.s.tenantId, (tx) => listNotices(tx)) });
}
export async function POST(req: NextRequest) {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  if (!canWriteNotice(a.s.role)) return NextResponse.json({ error: "forbidden — 공지는 회사 owner 가 씁니다" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = str(b.title, 80);
  if (!title) return NextResponse.json({ error: "title(1~80)" }, { status: 400 });
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 500) : "";
  const r = await withTenant(a.s.tenantId, (tx) => addNotice(tx, { title, body, createdBy: a.s.userId }));
  return NextResponse.json({ ok: true, id: r.id });
}
