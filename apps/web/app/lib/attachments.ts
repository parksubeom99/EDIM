import type { TenantClient } from "@edim/db";

/**
 * 첨부(0025) — 코드 DWG(p32) · Arrangement Drawing Control(p35) · Data Up-Load(p18)가 같이 쓴다.
 * 파일 본체는 0014 접수 자료와 **같은 저장소**(app/lib/storage.ts putFile/getFile · 10MB 한도)에 둔다.
 */
export const ATTACH_KINDS = ["dwg2d", "dwg3d", "data"] as const;
export type AttachKind = (typeof ATTACH_KINDS)[number];
export const ATTACH_LABEL: Record<AttachKind, string> = { dwg2d: "DWG 2D", dwg3d: "DWG 3D", data: "자료" };
/** 허용 확장자 — 종류별. 그 밖은 415. */
export const ATTACH_EXT: Record<AttachKind, readonly string[]> = {
  dwg2d: [".dwg", ".dxf", ".pdf", ".png", ".jpg", ".jpeg", ".svg"],
  dwg3d: [".step", ".stp", ".igs", ".iges", ".stl", ".glb", ".gltf", ".obj"],
  data: [".pdf", ".csv", ".xlsx", ".xls", ".txt", ".docx", ".png", ".jpg", ".jpeg", ".dxf", ".dwg", ".zip"],
};
export const OWNER_KINDS = ["product_code", "arrangement_code", "node"] as const;
export type OwnerKind = (typeof OWNER_KINDS)[number];

export const extOf = (name: string) => { const i = name.lastIndexOf("."); return i < 0 ? "" : name.slice(i).toLowerCase(); };

/**
 * 첨부 대상이 이 회사에 있는지(RLS — 다른 회사 것은 안 보여 404) · 붙일 수 있는 상태인지(409).
 *   product_code      : owner_key = 코드. 사용중지(retired) 코드에는 새 도면을 붙이지 않는다.
 *   arrangement_code  : owner_key = id. **승인된(approved)** Arrangement Code 에만 도면을 붙인다(p35 Drawing Control).
 *   node              : owner_key = 작업대 Hierarchy 노드 stable id.
 */
export async function ownerCheck(tx: TenantClient, kind: OwnerKind, key: string): Promise<{ ok: true; label: string } | { status: 404 | 409; error: string }> {
  if (kind === "product_code") {
    const p = await tx.productCode.findFirst({ where: { code: key } });
    if (!p) return { status: 404, error: `코드 ${key} 없음` };
    if (p.approvalStatus === "retired") return { status: 409, error: `${key} 는 사용중지된 코드 — 새 도면을 붙이지 않습니다` };
    return { ok: true, label: `${p.code} ${p.name}` };
  }
  if (kind === "arrangement_code") {
    if (!/^[0-9a-f-]{36}$/i.test(key)) return { status: 404, error: "Arrangement Code 없음" };
    const a = await tx.arrangementCode.findFirst({ where: { id: key } });
    if (!a) return { status: 404, error: "Arrangement Code 없음" };
    if (a.status !== "approved") return { status: 409, error: `${a.code} 는 승인 전(${a.status}) — 승인된 Arrangement Code 에만 도면을 붙입니다` };
    return { ok: true, label: a.code };
  }
  if (!/^[0-9a-f-]{36}$/i.test(key)) return { status: 404, error: "노드 없음" };
  const n = await tx.hierarchyNode.findFirst({ where: { stableId: key, isCurrent: true } });
  if (!n) return { status: 404, error: "노드 없음" };
  return { ok: true, label: n.label };
}
