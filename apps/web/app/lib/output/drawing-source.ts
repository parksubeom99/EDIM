import { withTenant, getBomRun } from "@edim/db";
import type { Dims } from "@edim/bom-code";
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

function parseDims(v: unknown): { dims: Dims; item: string } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : null);
  const W = n("W"), H = n("H"), L = n("L");
  if (W === null || H === null || L === null || typeof o.item !== "string") return null;
  return { dims: { W, H, L }, item: o.item };
}

export async function dxfSourceFromRun(tenantId: string, runId: string): Promise<DxfSource> {
  const run = await withTenant(tenantId, (tx) => getBomRun(tx, runId));
  if (!run) return { ok: false, status: 404, error: "BOM 스냅샷을 찾을 수 없습니다" };

  // 0011: 치수는 스냅샷에 박힌 값만 읽는다 — 표가 나중에 바뀌어도 이 BOM 의 도면은 그때 승인된 치수로 그려진다.
  // 0011 이전 스냅샷(dims 없음)은 추측하지 않고 거부한다.
  const d = parseDims(run.dims);
  if (!d) return { ok: false, status: 422, error: "이 BOM 스냅샷에는 치수가 저장돼 있지 않습니다(0011 이전 실행) — BOM Run 을 다시 하십시오" };

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
