import { withTenant, getBomRun } from "@edim/db";
import { parseCadRules, detailFacts, type Dims, type DetailDim } from "@edim/bom-code";
import type { DxfInput, DrawingItem, DxfCad } from "./dxf";

/**
 * P4-a — **산출물의 단 하나의 입구**.
 *
 * 도면(그리고 뒤이어 견적·구매)은 화면 상태가 아니라 저장된 BOM 스냅샷에서 나온다.
 * 스냅샷 하나에 코드·슬롯·줄·원가·카탈로그 지문·코드 개정이 모두 박혀 있으므로,
 * 나중에 "이 도면이 어디서 나왔나"를 거꾸로 따라갈 수 있다(연결 장부 약함 #2).
 */
export type DxfSource =
  | { ok: true; input: DxfInput; run: { id: string; code: string; stableId: string | null; codeRevisionId: string | null; parentCode: string } }
  | { ok: false; status: number; error: string };

interface SnapLine {
  no?: unknown; section?: unknown; part?: unknown; qty?: unknown; unit?: unknown;
  childCode?: unknown; remarks?: unknown;
  /** ccmd K · KA — Special 결과를 읽은 줄(팬 · 모터). 조립도 Item 표가 사양(모델 · kW)을 함께 적는다. */
  spec?: unknown; fromSpecial?: unknown;
}

function parseDims(v: unknown): { dims: Dims; item: string; secDims: { name: string; len: number; dir?: string; components?: { code: string; at: string; level: string }[] }[] } | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : null);
  const W = n("W"), H = n("H"), L = n("L");
  if (W === null || H === null || L === null || typeof o.item !== "string") return null;
  const secDims = Array.isArray(o.sections)
    ? (o.sections as unknown[]).flatMap((s) => {
        if (!(s && typeof s === "object")) return [];
        const r = s as Record<string, unknown>;
        if (typeof r.name !== "string" || typeof r.len !== "number") return [];
        // Arrangement 2차: 방향도 스냅샷에 박힌 값만 쓴다(현재 등록 표를 다시 읽지 않는다 — 0011 과 같은 원칙)
        const comps = Array.isArray(r.components)
          ? (r.components as unknown[]).flatMap((c) => {
              if (!(c && typeof c === "object")) return [];
              const o2 = c as Record<string, unknown>;
              return typeof o2.code === "string" && typeof o2.at === "string" && typeof o2.level === "string"
                ? [{ code: o2.code, at: o2.at, level: o2.level }] : [];
            })
          : [];
        return [{ name: r.name, len: r.len, ...(typeof r.dir === "string" ? { dir: r.dir } : {}), ...(comps.length > 0 ? { components: comps } : {}) }];
      })
    : [];
  return { dims: { W, H, L }, item: o.item, secDims };
}

/**
 * 스냅샷의 dims.detail · dims.cadRules → 조립도가 그릴 CAD 입력. 둘 다 없으면 null(기존 스냅샷 · 기존 제품 — 도면 바이트 그대로).
 * 규칙서가 박혔는데 지금 검사기로 읽을 수 없으면(옛 형식) 추측하지 않고 422 — 0011 의 옛 스냅샷 처리와 같다.
 */
function parseCad(v: unknown, d: { dims: Dims; secDims: { len: number }[] }): DxfCad | { error: string } | null {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  if (!("cadRules" in o) && !("detail" in o)) return null;
  const snap = (o.cadRules && typeof o.cadRules === "object" ? o.cadRules : null) as { version?: unknown; fingerprint?: unknown; sample?: unknown; rules?: unknown } | null;
  const p = snap ? parseCadRules(snap.rules) : null;
  if (!snap || !p || !p.ok || typeof snap.fingerprint !== "string")
    return { error: `이 BOM 스냅샷의 CAD 규칙서(${String(snap?.version ?? "없음")} #${String(snap?.fingerprint ?? "—")})를 지금 도면 생성기로 읽을 수 없습니다${p && !p.ok ? ` — ${p.error}` : ""} — BOM Run 을 다시 하십시오` };
  const details: DetailDim[] = Array.isArray(o.detail)
    ? (o.detail as unknown[]).flatMap((x) => {
        const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
        return typeof r.target === "string" && typeof r.label === "string" && typeof r.value === "number"
          ? [{ target: r.target, label: r.label, value: r.value, source: typeof r.source === "string" ? r.source : "" }] : [];
      })
    : [];
  const total = d.secDims.length > 0 ? d.secDims.reduce((a, s) => a + s.len, 0) : d.dims.L;
  const facts: Record<string, number | string> = { "dim.W": d.dims.W, "dim.H": d.dims.H, "dim.L": total, ...detailFacts(details) };
  const sp = (o.special && typeof o.special === "object" ? (o.special as { result?: Record<string, unknown> }).result : null) ?? null;
  if (sp) for (const [k, val] of Object.entries(sp)) if (typeof val === "number" || typeof val === "string") facts[`special.${k}`] = val;
  return { version: String(snap.version ?? ""), fingerprint: snap.fingerprint, sample: String(snap.sample ?? ""), rules: p.rules, details, facts };
}

export async function dxfSourceFromRun(tenantId: string, runId: string): Promise<DxfSource> {
  const run = await withTenant(tenantId, (tx) => getBomRun(tx, runId));
  if (!run) return { ok: false, status: 404, error: "BOM 스냅샷을 찾을 수 없습니다" };

  // 0011: 치수는 스냅샷에 박힌 값만 읽는다 — 표가 나중에 바뀌어도 이 BOM 의 도면은 그때 승인된 치수로 그려진다.
  // 0011 이전 스냅샷(dims 없음)은 추측하지 않고 거부한다.
  const d = parseDims(run.dims);
  if (!d) return { ok: false, status: 422, error: "이 BOM 스냅샷에는 치수가 저장돼 있지 않습니다(0011 이전 실행) — BOM Run 을 다시 하십시오" };
  // 설계 검증(p36) — 스냅샷에 박힌 판정이 위반이면 도면을 뜨지 않는다. 검증 안 된 도면이 밖으로 나가지 않게.
  const vio = (run.dims as Record<string, unknown> | null)?.violations;
  if (Array.isArray(vio) && vio.length > 0) {
    const why = vio.map((v) => {
      const o2 = v as Record<string, unknown>;
      if (o2.op === "macro") return `${String(o2.name)}(매크로 ${String(o2.limit)} → ${String(o2.actual)})`;
      return `${String(o2.name)}(${String(o2.target)} ${String(o2.op)} ${String(o2.limit)} · 지금 ${String(o2.actual)})`;
    }).join(", ");
    return { ok: false, status: 422, error: `설계 검증 위반이라 도면을 뜰 수 없습니다: ${why} — 치수·구획을 고치고 BOM Run 을 다시 하십시오` };
  }

  const raw = Array.isArray(run.lines) ? (run.lines as SnapLine[]) : [];
  const items: DrawingItem[] = raw.map((l, i) => ({
    no: typeof l.no === "number" ? l.no : i + 1,
    part: typeof l.part === "string" ? l.part : "",
    qty: typeof l.qty === "number" ? l.qty : 0,
    unit: typeof l.unit === "string" ? l.unit : "ea",
    ...(typeof l.childCode === "string" ? { childCode: l.childCode } : {}),
    ...(typeof l.remarks === "string" ? { remarks: l.remarks } : {}),
    ...(l.fromSpecial === true && typeof l.spec === "string" && l.spec ? { spec: l.spec } : {}),
  }));
  const sections: string[] = [];
  for (const l of raw) {
    const s = typeof l.section === "string" ? l.section : "";
    if (s && !sections.includes(s)) sections.push(s);
  }
  // ccmd K · KC-1 · KC-2 — 세부 치수 · CAD 규칙서는 스냅샷에 박힌 것만 읽는다(지금 파일 · 지금 표를 다시 읽지 않는다 — 0011).
  const cad = parseCad(run.dims, d);
  if (cad && "error" in cad) return { ok: false, status: 422, error: cad.error };

  return {
    ok: true,
    input: { code: run.code, dims: d.dims, dimItem: d.item, sections, secDims: d.secDims, items, ...(cad ? { cad } : {}) },
    run: { id: run.id, code: run.code, stableId: run.hierarchyStable, codeRevisionId: run.codeRevisionId, parentCode: run.parentCode },
  };
}
