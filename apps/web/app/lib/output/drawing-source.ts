import { withTenant, getBomRun } from "@edim/db";
import { dimsFor, catalogFingerprint } from "@edim/bom-code";
import { loadCatalog } from "../catalog";
import type { DxfInput, DrawingItem } from "./dxf";

/**
 * P4-a — **산출물의 단 하나의 입구**.
 *
 * 도면(그리고 뒤이어 견적·구매)은 화면 상태가 아니라 저장된 BOM 스냅샷에서 나온다.
 * 스냅샷 하나에 코드·슬롯·줄·원가·카탈로그 지문·코드 개정이 모두 박혀 있으므로,
 * 나중에 "이 도면이 어디서 나왔나"를 거꾸로 따라갈 수 있다(연결 장부 약함 #2).
 */
export type DxfSource =
  | { ok: true; input: DxfInput; run: { id: string; code: string; stableId: string | null; codeRevisionId: string | null } }
  | { ok: false; status: number; error: string };

interface SnapLine {
  no?: unknown; section?: unknown; part?: unknown; qty?: unknown; unit?: unknown;
  childCode?: unknown; remarks?: unknown;
}

export async function dxfSourceFromRun(tenantId: string, runId: string): Promise<DxfSource> {
  const run = await withTenant(tenantId, (tx) => getBomRun(tx, runId));
  if (!run) return { ok: false, status: 404, error: "BOM 스냅샷을 찾을 수 없습니다" };

  const { catalog } = await loadCatalog(tenantId);
  const product = catalog.productCodes.find((p) => p.code === run.parentCode && p.kind === "product");
  if (!product)
    return { ok: false, status: 422, error: `제품 코드 ${run.parentCode} 가 등록되어 있지 않습니다` };

  // 치수는 아직 스냅샷에 박혀 있지 않고 **현재 등록 표**에서 읽는다. 그래서 스냅샷을 뜬 뒤 표가 바뀌었으면
  // 이 스냅샷의 도면은 그릴 수 없다 — 그리면 "승인된 BOM + 승인된 적 없는 치수"의 도면이 나간다(S30f 가 잡은 결함).
  // 지문이 다르면 거짓 도면 대신 거절한다. 이미 등록된 도면은 내용이 저장돼 있어 영향받지 않는다.
  // (근본 해법 = 스냅샷에 치수를 함께 박는 것 · 스키마 변경이라 회장님 승인 대기 — 그때 이 가드는 걷어낸다.)
  if (run.catalogFp !== catalogFingerprint(catalog))
    return {
      ok: false, status: 409,
      error: "이 BOM 스냅샷을 뜬 뒤 등록 표가 바뀌었습니다 — 이 스냅샷으로는 도면을 새로 그릴 수 없습니다. BOM Run 을 다시 하십시오(새 BOM 은 다시 승인받아야 발행됩니다).",
    };

  // 치수는 등록 표에서만 온다. 없으면 **추측하지 않고 거부**한다.
  const d = dimsFor(product, (run.slots ?? {}) as Record<string, string>);
  if (!d.ok) return { ok: false, status: 422, error: d.message };

  const raw = Array.isArray(run.lines) ? (run.lines as SnapLine[]) : [];
  const items: DrawingItem[] = raw.map((l, i) => ({
    no: typeof l.no === "number" ? l.no : i + 1,
    part: typeof l.part === "string" ? l.part : "",
    qty: typeof l.qty === "number" ? l.qty : 0,
    unit: typeof l.unit === "string" ? l.unit : "ea",
    ...(typeof l.childCode === "string" ? { childCode: l.childCode } : {}),
    ...(typeof l.remarks === "string" ? { remarks: l.remarks } : {}),
  }));
  const sections: string[] = [];
  for (const l of raw) {
    const s = typeof l.section === "string" ? l.section : "";
    if (s && !sections.includes(s)) sections.push(s);
  }

  return {
    ok: true,
    input: { code: run.code, dims: d.dims, dimItem: d.item, sections, items },
    run: { id: run.id, code: run.code, stableId: run.hierarchyStable, codeRevisionId: run.codeRevisionId },
  };
}
