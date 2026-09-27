import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { withTenant, writeAudit, requireTenant } from "@edim/db";
import { MAX_UPLOAD_BYTES, putFile } from "@/app/lib/storage";
import { ATTACH_EXT, ATTACH_KINDS, OWNER_KINDS, extOf, ownerCheck, type AttachKind, type OwnerKind } from "@/app/lib/attachments";
import { guard } from "../setup/_guard";

/**
 * 첨부(0025) — 코드 DWG(p32) · Arrangement Drawing Control(p35) · Data Up-Load(p18).
 * GET  ?ownerKind=&ownerKey= → { rows }
 * POST multipart { ownerKind, ownerKey, kind(dwg2d|dwg3d|data), file, name?, description? }
 *   10MB 초과 413 · 종류별 허용 확장자 밖 415 · 대상 없음(다른 회사 포함) 404 · 붙일 수 없는 상태 409 · viewer 403
 * 파일은 0014 접수 자료와 같은 저장소(putFile). 첨부는 고치지 않는다(새 파일 = 새 행).
 */
const isOwner = (v: unknown): v is OwnerKind => typeof v === "string" && (OWNER_KINDS as readonly string[]).includes(v);
const isKind = (v: unknown): v is AttachKind => typeof v === "string" && (ATTACH_KINDS as readonly string[]).includes(v);

export async function GET(req: NextRequest) {
  const g = await guard(false);
  if ("res" in g) return g.res;
  const q = new URL(req.url).searchParams;
  const ownerKind = q.get("ownerKind"), ownerKey = q.get("ownerKey") ?? "";
  if (!isOwner(ownerKind) || !ownerKey) return NextResponse.json({ error: "ownerKind · ownerKey 필수" }, { status: 400 });
  const rows = await withTenant(g.session.tenantId, (tx) => tx.attachment.findMany({ where: { ownerKind, ownerKey }, orderBy: { uploadedAt: "desc" } }));
  return NextResponse.json({ rows: rows.map((a) => ({ id: a.id, kind: a.kind, name: a.name, description: a.description, fileMime: a.fileMime, fileSize: a.fileSize, uploadedAt: a.uploadedAt })) });
}

export async function POST(req: NextRequest) {
  const g = await guard(true);
  if ("res" in g) return g.res;
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "multipart/form-data 로 보내십시오" }, { status: 400 });
  const ownerKind = fd.get("ownerKind"), ownerKey = String(fd.get("ownerKey") ?? "").trim(), kind = fd.get("kind"), file = fd.get("file");
  if (!isOwner(ownerKind) || !ownerKey || !isKind(kind) || !(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "ownerKind · ownerKey · kind(dwg2d|dwg3d|data) · file 필수" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "10MB 를 넘는 파일은 받지 않습니다" }, { status: 413 });
  const ext = extOf(file.name);
  if (!ATTACH_EXT[kind].includes(ext)) return NextResponse.json({ error: `${kind} 에 받을 수 있는 파일: ${ATTACH_EXT[kind].join(" ")}` }, { status: 415 });
  const name = (String(fd.get("name") ?? "").trim() || file.name).slice(0, 120);
  const description = String(fd.get("description") ?? "").trim().slice(0, 500) || null;
  const bytes = Buffer.from(await file.arrayBuffer());
  const out = await withTenant(g.session.tenantId, async (tx) => {
    const c = await ownerCheck(tx, ownerKind, ownerKey);
    if (!("ok" in c)) return c;
    const tenantId = await requireTenant(tx);
    const fileRef = await putFile(g.session.tenantId, randomUUID(), bytes);
    const row = await tx.attachment.create({ data: { tenantId, ownerKind, ownerKey, kind, name, description, fileRef, fileMime: (file.type || "application/octet-stream").slice(0, 100), fileSize: file.size, uploadedBy: g.session.userId } });
    await writeAudit(tx, g.session.userId, "create", "attachment", row.id, null, { ownerKind, ownerKey, kind, name, size: file.size });
    return { id: row.id };
  });
  if (!("id" in out)) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, id: out.id });
}
