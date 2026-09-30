import type { ProductCode, SlotValues, TechTable, At, Level, Install } from "./index";

// index.ts 가 이 파일을 다시 내보내므로(순환) 값 import 대신 같은 목록을 여기서 본다 — INSTALLS 와 같아야 한다(cad.test 가 대조)
const isInstall = (v: unknown): v is Install => v === "DD" || v === "BI" || v === "BA";

/* ── ccmd K · KC-1 — Detail Dimension (p36 · p38 · p60) ──────────────────────────
 * 제품 코드의 role="detail" 표. 한 행 = 세부 치수 하나. 열 이름으로 읽는다 — target · label · value · from.
 *   target : 구획 이름(Fan …) 또는 BOM 자식 코드(SFN 1 …)
 *   label  : A~K (p36 Item A B C D E 표 모양)
 *   value  : mm (숫자). from 이 있으면 무시한다.
 *   from   : `<표>.<열>` — 그 표에서 **슬롯으로 고른 행**의 열 값(p36 "710 → 679 · 760 …" 처럼 사이즈 행에서 찾는다).
 * BOM Run 이 결과를 스냅샷 dims.detail 에 박는다(0011) — 표를 나중에 고쳐도 뜬 스냅샷의 도면은 그대로다.
 * 등록이 틀리면 0 이나 빈칸으로 메우지 않고 이유와 함께 거부한다.
 */
export const DETAIL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"] as const;
export interface DetailDim { target: string; label: string; value: number; source: string }

export function detailTableOf(p: ProductCode): [string, TechTable] | null {
  const e = Object.entries(p.tables ?? {}).find(([, t]) => t.role === "detail");
  return e ?? null;
}

export type DetailResult =
  | { ok: true; dims: DetailDim[]; tableName: string }
  | { ok: false; message: string };

/** 세부 치수를 뽑는다. 표가 없으면 null(세부 치수를 쓰지 않는 제품 — 기존 제품 전부). */
export function detailDimsOf(product: ProductCode, slots: SlotValues): DetailResult | null {
  const entry = detailTableOf(product);
  if (!entry) return null;
  const [tableName, t] = entry;
  const colOf = (nm: string) => t.cols.find((c) => c.name.toLowerCase() === nm)?.key;
  const kT = colOf("target"), kL = colOf("label"), kV = colOf("value"), kF = colOf("from");
  if (!kT || !kL || (!kV && !kF)) return { ok: false, message: `detail 표 ${tableName} 에 열 target · label · value(또는 from) 가 필요합니다` };
  const out: DetailDim[] = [];
  const seen = new Set<string>();
  for (const r of t.rows) {
    const target = String(r.cells[kT] ?? "").trim();
    const label = String(r.cells[kL] ?? "").trim().toUpperCase();
    const where = `detail 표 ${tableName} 의 행 '${r.item}'`;
    if (!target || !/^[\w][\w -]{0,39}$/.test(target)) return { ok: false, message: `${where} — target(구획 이름 또는 자식 코드)이 비었거나 형식이 틀렸습니다` };
    if (!(DETAIL_LABELS as readonly string[]).includes(label)) return { ok: false, message: `${where} — label 은 A~K 입니다(지금 '${label}')` };
    const key = `${target}.${label}`;
    if (seen.has(key)) return { ok: false, message: `${where} — ${key} 가 두 번 등록됐습니다` };
    seen.add(key);
    const from = kF ? String(r.cells[kF] ?? "").trim() : "";
    let value: number;
    let source: string;
    if (from) {
      const m = /^(\w+)\.(\w+)$/.exec(from);
      const st = m ? product.tables[m[1]!] : undefined;
      if (!m || !st) return { ok: false, message: `${where} — from '${from}' 표가 이 제품 코드에 없습니다` };
      if (st.bySpecial) return { ok: false, message: `${where} — from '${from}' 는 Special 결과로 행을 고르는 표라 세부 치수 출처가 될 수 없습니다` };
      const want = (slots[st.by] ?? "") || st.default;
      const row = st.rows.find((x) => x.item === want);
      if (!row) return { ok: false, message: `${where} — from '${from}' 표에 ${st.by}=${want} 행이 없습니다` };
      const col = st.cols.find((c) => c.name === m[2] || c.key === m[2]);
      const cell = col ? row.cells[col.key] : undefined;
      value = typeof cell === "number" ? cell : Number(cell);
      source = `${from}(Table${st.no} · ${st.by}=${want})`;
    } else {
      const cell = kV ? r.cells[kV] : undefined;
      value = typeof cell === "number" ? cell : Number(cell);
      source = "등록 값";
    }
    if (!Number.isFinite(value) || value <= 0) return { ok: false, message: `${where} — ${key} 값이 양수 mm 가 아닙니다(${String(value)})` };
    out.push({ target, label, value, source });
  }
  return { ok: true, dims: out, tableName };
}

/** 설계 검증이 읽는 세부 치수 사실 — 키 `detail.<대상>.<label>`. */
export function detailFacts(details: DetailDim[] | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of details ?? []) out[`detail.${d.target}.${d.label}`] = d.value;
  return out;
}

/* ── ccmd K · KC-2 — CAD 규칙서(샘플) ────────────────────────────────────────────
 * 3×3 칸 → 구획 안 mm 좌표 · 기준점(p36 Point: Shaft · Foot) · KAD-□ 슬롯 ↔ 치수 키 대응을 **파일 하나**로 둔다.
 * 파일을 바꾸면 코드 수정 없이 도면이 바뀐다. BOM Run 이 규칙서 내용 · 지문 · 판을 스냅샷에 박는다(도면은 스냅샷만 읽는다).
 * KAD 슬롯 문법은 RCCS 문법 사안이라 확정하지 않는다 — 규칙서의 "샘플 대응표"일 뿐이다.
 */
export interface CadDatum { name: string; xRatio: number; yRatio: number; xMm: number; yMm: number }
export interface CadKadSlot { slot: number; key: string }
/** ccmd M · p36 Installation Code — 구동 방식마다 모터 자리 = 기준점(from) + (dxMm, dyMm). 방향이 돌면 이 벡터가 같이 돈다. */
export interface CadInstall { code: Install; name: string; from: string; dxMm: number; dyMm: number }
export interface CadRules {
  version: string;
  sample: string;
  grid: { at: Record<At, number>; level: Record<Level, number>; offsetMm: { x: number; y: number } };
  datum: CadDatum[];
  kad: { note: string; prefix: string; slots: CadKadSlot[] };
  detail: { anchor: string; startMm: number; gapMm: number };
  /** ccmd M · p36 — 없으면 구동 방식 규칙 없음(모터 자리를 그리지 않는다 · 옛 규칙서 그대로 통과) */
  installation?: { note: string; types: CadInstall[] };
  /** ccmd M · p36 방향 L0~R270 ↔ 기준점 결합 — mirrorR: R 방향이면 구획 안 기준점을 길이 방향으로 뒤집는다. 없으면 방향과 무관(옛 규칙서) */
  direction?: { note: string; mirrorR: boolean };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** 규칙서 JSON 을 검사한다. 틀리면 무엇이 틀렸는지 한 문장. 조용히 기본값으로 메우지 않는다. */
export function parseCadRules(v: unknown): { ok: true; rules: CadRules } | { ok: false; error: string } {
  if (!isObj(v)) return { ok: false, error: "규칙서가 JSON 객체가 아닙니다" };
  if (typeof v.version !== "string" || !v.version) return { ok: false, error: "version 이 없습니다" };
  if (typeof v.sample !== "string") return { ok: false, error: "sample 표지 문구가 없습니다(샘플 규칙서는 '샘플'을 밝힌다)" };
  const g = v.grid;
  if (!isObj(g) || !isObj(g.at) || !isObj(g.level) || !isObj(g.offsetMm)) return { ok: false, error: "grid.at · grid.level · grid.offsetMm 이 필요합니다" };
  const at = g.at as Record<string, unknown>, lv = g.level as Record<string, unknown>, off = g.offsetMm as Record<string, unknown>;
  for (const k of ["front", "center", "rear"]) if (!fin(at[k]) || (at[k] as number) < 0 || (at[k] as number) > 1) return { ok: false, error: `grid.at.${k} 는 0~1 비율입니다` };
  for (const k of ["top", "mid", "bottom"]) if (!fin(lv[k]) || (lv[k] as number) < 0 || (lv[k] as number) > 1) return { ok: false, error: `grid.level.${k} 는 0~1 비율입니다` };
  if (!fin(off.x) || !fin(off.y)) return { ok: false, error: "grid.offsetMm.x · y 는 숫자(mm)입니다" };
  if (!Array.isArray(v.datum) || v.datum.length === 0) return { ok: false, error: "datum(기준점)이 하나 이상 필요합니다" };
  const datum: CadDatum[] = [];
  for (const d of v.datum) {
    if (!isObj(d) || typeof d.name !== "string" || !d.name || !fin(d.xRatio) || !fin(d.yRatio) || !fin(d.xMm) || !fin(d.yMm)) return { ok: false, error: "datum 행은 name · xRatio · yRatio · xMm · yMm 입니다" };
    datum.push({ name: d.name, xRatio: d.xRatio, yRatio: d.yRatio, xMm: d.xMm, yMm: d.yMm });
  }
  const k = v.kad;
  if (!isObj(k) || typeof k.note !== "string" || typeof k.prefix !== "string" || !Array.isArray(k.slots)) return { ok: false, error: "kad.note · kad.prefix · kad.slots 가 필요합니다" };
  const slots: CadKadSlot[] = [];
  for (const s of k.slots) {
    if (!isObj(s) || !fin(s.slot) || typeof s.key !== "string" || !/^(dim\.[WHL]|detail\.[\w -]+\.[A-K]|special\.\w+)$/.test(s.key)) return { ok: false, error: "kad.slots 행은 slot(번호) · key(dim.W · detail.<대상>.<A~K> · special.<필드>) 입니다" };
    slots.push({ slot: s.slot, key: s.key });
  }
  const dt = v.detail;
  if (!isObj(dt) || typeof dt.anchor !== "string" || !fin(dt.startMm) || !fin(dt.gapMm)) return { ok: false, error: "detail.anchor · startMm · gapMm 이 필요합니다" };
  if (!datum.some((d) => d.name === dt.anchor)) return { ok: false, error: `detail.anchor '${dt.anchor}' 가 datum 에 없습니다` };
  let installation: CadRules["installation"];
  if (v.installation !== undefined) {
    const ins = v.installation;
    if (!isObj(ins) || typeof ins.note !== "string" || !Array.isArray(ins.types) || ins.types.length === 0) return { ok: false, error: "installation.note · installation.types 가 필요합니다" };
    const types: CadInstall[] = [];
    for (const t of ins.types) {
      if (!isObj(t) || !isInstall(t.code) || typeof t.name !== "string" || typeof t.from !== "string" || !fin(t.dxMm) || !fin(t.dyMm))
        return { ok: false, error: "installation.types 행은 code(DD · BI · BA) · name · from(기준점) · dxMm · dyMm 입니다" };
      if (!datum.some((d) => d.name === t.from)) return { ok: false, error: `installation ${t.code}: from '${t.from}' 가 datum 에 없습니다` };
      if (types.some((x) => x.code === t.code)) return { ok: false, error: `installation ${t.code} 가 두 번 있습니다` };
      types.push({ code: t.code, name: t.name, from: t.from, dxMm: t.dxMm, dyMm: t.dyMm });
    }
    installation = { note: ins.note, types };
  }
  let direction: CadRules["direction"];
  if (v.direction !== undefined) {
    const d = v.direction;
    if (!isObj(d) || typeof d.note !== "string" || typeof d.mirrorR !== "boolean") return { ok: false, error: "direction.note · direction.mirrorR(참/거짓) 이 필요합니다" };
    direction = { note: d.note, mirrorR: d.mirrorR };
  }
  return {
    ok: true,
    rules: {
      version: v.version, sample: v.sample,
      grid: { at: { front: at.front as number, center: at.center as number, rear: at.rear as number }, level: { top: lv.top as number, mid: lv.mid as number, bottom: lv.bottom as number }, offsetMm: { x: off.x as number, y: off.y as number } },
      datum, kad: { note: k.note, prefix: k.prefix, slots: slots.sort((a, b) => a.slot - b.slot) },
      detail: { anchor: dt.anchor, startMm: dt.startMm, gapMm: dt.gapMm },
      ...(installation ? { installation } : {}), ...(direction ? { direction } : {}),
    },
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 3×3 칸 → 구획 안 mm 좌표(부품 중심). 구획 원점 = (secStart, 0), 길이 방향 x · 폭 방향 y. */
export function componentMm(rules: CadRules, secStart: number, secLen: number, W: number, at: At, level: Level): { x: number; y: number } {
  return { x: r1(secStart + rules.grid.at[at] * secLen + rules.grid.offsetMm.x), y: r1(rules.grid.level[level] * W + rules.grid.offsetMm.y) };
}

/** R 방향이고 규칙서가 mirrorR 이면 참 — 방향이 없거나 규칙서에 direction 이 없으면 거짓(옛 도면 그대로). */
const mirrored = (rules: CadRules, dir?: string | null) => !!dir && dir.startsWith("R") && !!rules.direction?.mirrorR;

/** 구획의 기준점(p36 Point: Shaft · Foot) mm 좌표. ccmd M — 방향(dir)이 R 이고 규칙서 mirrorR 이면 구획 안에서 길이 방향으로 뒤집는다. */
export function datumMm(rules: CadRules, secStart: number, secLen: number, W: number, dir?: string | null): { name: string; x: number; y: number }[] {
  const m = mirrored(rules, dir);
  return rules.datum.map((d) => ({ name: d.name, x: r1(m ? secStart + (1 - d.xRatio) * secLen - d.xMm : secStart + d.xRatio * secLen + d.xMm), y: r1(d.yRatio * W + d.yMm) }));
}

/**
 * ccmd M · p36 모터 자리(구동 방식) = 규칙서 installation 의 기준점(from) + (dx, dy).
 * 방향 결합: R 이고 mirrorR 이면 dx 를 뒤집고, 방향 각도(0 · 90 · 180 · 270)만큼 (dx, dy) 를 돌린다.
 * 규칙서에 그 구동 방식이 없으면 null — 자리를 지어내지 않는다.
 */
export function motorMm(rules: CadRules, secStart: number, secLen: number, W: number, dir: string | null | undefined, install: Install): { code: Install; name: string; from: string; x: number; y: number } | null {
  const t = rules.installation?.types.find((x) => x.code === install);
  if (!t) return null;
  const base = datumMm(rules, secStart, secLen, W, dir).find((d) => d.name === t.from);
  if (!base) return null;
  const dx0 = mirrored(rules, dir) ? -t.dxMm : t.dxMm, dy0 = t.dyMm;
  const deg = dir && rules.direction ? Number(dir.slice(1)) || 0 : 0;
  const rad = (deg * Math.PI) / 180, c = Math.round(Math.cos(rad)), s = Math.round(Math.sin(rad));
  return { code: t.code, name: t.name, from: t.from, x: r1(base.x + dx0 * c - dy0 * s), y: r1(base.y + dx0 * s + dy0 * c) };
}

/** KAD-□ 슬롯 값 — 대응표의 치수 키를 스냅샷 사실에서 읽는다. 없는 키는 "?" (지어내지 않는다). */
export function kadValues(rules: CadRules, facts: Record<string, number | string>): { slot: number; key: string; value: string }[] {
  return rules.kad.slots.map((s) => ({ slot: s.slot, key: s.key, value: facts[s.key] !== undefined ? String(facts[s.key]) : "?" }));
}
