import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { platformInsertSource, platformListFormulas, platformSetSourceMonitor } from "@edim/db";
import { requirePlatform } from "../_auth";
import { monitorSource } from "@/app/lib/learning/monitor";

/**
 * B · 원천 자료 올리기 — 플랫폼 관리자만, **DB① 에만**. DXF(도면) · CSV(기술문서 표)만 받는다(1수준 — PDF 해석 없음).
 * 같은 파일(sha256)은 409. 올리는 순간 승인된 공식에 대어 보고(운영 감시) 결과를 원천에 남긴다.
 */
const MAX = 5 * 1024 * 1024;
export async function POST(req: NextRequest) {
  const a = await requirePlatform();
  if (a instanceof NextResponse) return a;
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file 필요" }, { status: 400 });
  const name = file.name.replace(/[^\w.\-가-힣 ]/g, "_").slice(0, 120);
  const kind = /\.dxf$/i.test(name) ? "drawing" : /\.csv$/i.test(name) ? "techdoc" : null;
  if (!kind) return NextResponse.json({ error: "1수준은 .dxf(도면) · .csv(기술문서 표)만 — PDF 문서 해석은 아직 없음(필요한 입력: 문서 양식)" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "5MB 초과" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const sha = createHash("sha256").update(buf).digest("hex");
  const origin = fd?.get("origin") === "tenant-consented" ? "tenant-consented" : "upload";
  const id = await platformInsertSource({ kind, title: name, origin, isSample: false, content: buf, sha256: sha });
  if (!id) return NextResponse.json({ error: "같은 파일이 이미 있습니다(sha256)" }, { status: 409 });
  const approved = (await platformListFormulas()).filter((f) => f.state === "approved").map((f) => ({ id: f.id, target: f.target, expression: f.expression }));
  const monitor = await monitorSource(kind, buf.toString("utf8"), approved);
  await platformSetSourceMonitor(id, monitor);
  return NextResponse.json({ ok: true, id, sha8: sha.slice(0, 8), monitor });
}
