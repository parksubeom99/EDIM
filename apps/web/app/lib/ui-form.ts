/**
 * p25·p26 사용자 UI Form 의 모양(spec)과 검증 — 화면(설계·실행)과 API 가 같이 쓴다.
 * 격자 24 × 16 칸. 위젯 최대 40개. 참조(대상·Active Set-up)는 같은 폼 안의 위젯만.
 * ccmd M — Canvas(표 → 그래프) · 버튼 저장·삭제·등록(표 한 행을 쓴다 · 쓰기는 서버가 Set-Up 표 편집과 같은 검증으로) · 실행 설정 Call(하이퍼링크 · 매크로 실행)
 *          · Work Hierarchy 노드 연결(spec.nodes) · UI 개발 AI(결정론 설계 — designSpec) · Signal/Slot 목록(signalSlots). 전부 spec JSON 안(스키마 변경 없음).
 */
export const GRID_W = 24;
export const GRID_H = 16;
export const WIDGET_TYPES = ["button", "combo", "table", "label", "number", "canvas"] as const;   // number = 숫자 입력(C · Special 입력 폼 — param 으로 계산 입력에 잇는다)
export type WidgetType = (typeof WIDGET_TYPES)[number];
// 찾기 · 초기화 · 복사 · 저장 · 삭제 · 등록 · 실행 설정(Call). 저장·삭제·등록 = 대상 Table 의 한 행(Item = Active Set-up Combo 값)을
// 쓴다 — 서버(/api/ui-forms/[id]/run)가 Set-Up 표 편집과 같은 검증(parseTables) · 같은 역할(owner · engineer) · 감사 기록으로.
export const ACTIONS = ["find", "reset", "copy", "save", "delete", "register", "call"] as const;
export type Action = (typeof ACTIONS)[number];
export const WRITE_ACTIONS: readonly Action[] = ["save", "delete", "register"];
export const ACTION_LABEL: Record<Action, string> = { find: "찾기", reset: "초기화", copy: "복사", save: "저장", delete: "삭제", register: "등록", call: "실행(Call)" };
/** p25 실행 설정 — 하이퍼링크(EDIM 안 경로만) · 매크로 실행(연결된 노드의 승인 매크로를 Combo 값 = 코드 슬롯으로) */
export type Call = { kind: "link"; href: string } | { kind: "macro" };
export const SCOPES = ["CPQ · Selection", "Technical", "Document", "Design Management", "Purchasing"] as const;

export type Source = { kind: "subcode"; itemKey: string } | { kind: "table"; code: string; table: string };
export interface Widget {
  id: string; type: WidgetType; x: number; y: number; w: number; h: number; label: string;
  source?: Source; action?: Action; target?: string; filterBy?: string;
  /** number 위젯 — 계산이 읽는 입력 이름(예: q_cmh · p_pa · rho) · 단위 표시 */
  param?: string; unit?: string;
  /** number 위젯 — 저장·등록이 쓰는 대상 표의 열 key(A, B …) */
  col?: string;
  /** canvas 위젯 — 그릴 열 key(없으면 수로 된 열 전부) */
  cols?: string[];
  /** button 동작이 call 일 때 */
  call?: Call;
}
export interface UiSpec { widgets: Widget[]; /** p26 Work Hierarchy 노드별 UI — 이 폼이 붙는 노드(stable id) */ nodes?: string[] }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_SIZE: Record<WidgetType, [number, number]> = { button: [4, 2], combo: [5, 2], table: [12, 6], label: [6, 1], number: [6, 3], canvas: [10, 6] };
export function newWidget(type: WidgetType, x: number, y: number, taken: Set<string>): Widget {
  let n = 1; while (taken.has(`${type}${n}`)) n++;
  const [w, h] = DEFAULT_SIZE[type];
  return { id: `${type}${n}`, type, x: Math.max(0, Math.min(GRID_W - w, x)), y: Math.max(0, Math.min(GRID_H - h, y)), w, h,
    label: type === "button" ? "찾기" : type === "combo" ? `S-${n}` : type === "table" ? "동작 대상 Data" : type === "number" ? `입력 ${n}` : type === "canvas" ? "Canvas" : "Label",
    ...(type === "button" ? { action: "find" as const } : {}) };
}

/** 틀린 곳이 있으면 첫 이유를 돌려준다(부분 저장 없음). */
export function parseSpec(v: unknown): { ok: true; spec: UiSpec } | { ok: false; reason: string } {
  const ws = (v as { widgets?: unknown })?.widgets;
  if (!Array.isArray(ws)) return { ok: false, reason: "widgets 배열이 필요합니다" };
  if (ws.length > 40) return { ok: false, reason: "위젯은 40개까지입니다" };
  const out: Widget[] = []; const ids = new Set<string>();
  for (const raw of ws as Record<string, unknown>[]) {
    const id = typeof raw.id === "string" ? raw.id : "";
    if (!/^[a-z]+[0-9]{1,3}$/.test(id) || ids.has(id)) return { ok: false, reason: `위젯 id 가 잘못됐거나 겹칩니다: ${id || "(없음)"}` };
    ids.add(id);
    if (!(WIDGET_TYPES as readonly string[]).includes(raw.type as string)) return { ok: false, reason: `${id}: 종류` };
    const [x, y, w, h] = [raw.x, raw.y, raw.w, raw.h].map(Number);
    if (![x, y, w, h].every((n) => Number.isInteger(n)) || x! < 0 || y! < 0 || w! < 1 || h! < 1 || x! + w! > GRID_W || y! + h! > GRID_H)
      return { ok: false, reason: `${id}: 캔버스 밖입니다` };
    const wd: Widget = { id, type: raw.type as WidgetType, x: x!, y: y!, w: w!, h: h!, label: typeof raw.label === "string" ? raw.label.slice(0, 40) : "" };
    const src = raw.source as Record<string, unknown> | undefined;
    if (src) {
      if (src.kind === "subcode" && typeof src.itemKey === "string" && /^[A-F]$/.test(src.itemKey) && wd.type === "combo") wd.source = { kind: "subcode", itemKey: src.itemKey };
      else if (src.kind === "table" && typeof src.code === "string" && typeof src.table === "string" && (wd.type === "table" || wd.type === "canvas")) wd.source = { kind: "table", code: src.code.slice(0, 20), table: src.table.slice(0, 20) };
      else return { ok: false, reason: `${id}: 데이터 원천이 이 위젯 종류와 맞지 않습니다` };
    }
    if (raw.action !== undefined) {
      if (wd.type !== "button" || !(ACTIONS as readonly string[]).includes(raw.action as string)) return { ok: false, reason: `${id}: 동작` };
      wd.action = raw.action as Action;
    }
    if (raw.param !== undefined && raw.param !== "") {
      if (wd.type !== "number" || typeof raw.param !== "string" || !/^[a-z][a-z0-9_]{0,30}$/.test(raw.param)) return { ok: false, reason: `${id}: 입력 이름(param)은 숫자 위젯의 소문자·숫자·밑줄` };
      wd.param = raw.param;
    }
    if (typeof raw.unit === "string" && raw.unit && wd.type === "number") wd.unit = raw.unit.slice(0, 10);
    if (raw.col !== undefined && raw.col !== "") {
      if (wd.type !== "number" || typeof raw.col !== "string" || !/^[A-Z]{1,2}$/.test(raw.col)) return { ok: false, reason: `${id}: 쓰는 열(col)은 숫자 위젯의 열 key(A, B …)` };
      wd.col = raw.col;
    }
    if (raw.cols !== undefined) {
      if (wd.type !== "canvas" || !Array.isArray(raw.cols) || raw.cols.length > 8 || !raw.cols.every((c) => typeof c === "string" && /^[A-Z]{1,2}$/.test(c)))
        return { ok: false, reason: `${id}: 그릴 열(cols)은 Canvas 위젯의 열 key 8개까지` };
      if (raw.cols.length) wd.cols = [...new Set(raw.cols as string[])];
    }
    if (raw.call !== undefined) {
      const c = raw.call as Record<string, unknown> | null;
      if (wd.action !== "call" || !c) return { ok: false, reason: `${id}: 실행 설정은 동작이 Call 인 버튼만` };
      if (c.kind === "macro") wd.call = { kind: "macro" };
      else if (c.kind === "link" && typeof c.href === "string" && /^\/(?!\/)[\w\-./?=&%]{0,200}$/.test(c.href)) wd.call = { kind: "link", href: c.href };
      else return { ok: false, reason: `${id}: 하이퍼링크는 EDIM 안 경로(/ 로 시작)만` };
    }
    if (wd.action === "call" && !wd.call) return { ok: false, reason: `${id}: 실행 설정(하이퍼링크 · 매크로 실행)을 고르십시오` };
    if (typeof raw.target === "string" && raw.target) wd.target = raw.target;
    if (typeof raw.filterBy === "string" && raw.filterBy) wd.filterBy = raw.filterBy;
    out.push(wd);
  }
  const byId = new Map(out.map((w) => [w.id, w]));
  for (const w of out) {
    if (w.target && byId.get(w.target)?.type !== "table") return { ok: false, reason: `${w.id}: 대상은 Table 위젯이어야 합니다` };
    if (w.filterBy && byId.get(w.filterBy)?.type !== "combo") return { ok: false, reason: `${w.id}: Active Set-up 은 Combo box 위젯이어야 합니다` };
  }
  const nodesRaw = (v as { nodes?: unknown })?.nodes;
  let nodes: string[] | undefined;
  if (nodesRaw !== undefined) {
    if (!Array.isArray(nodesRaw) || nodesRaw.length > 20 || !nodesRaw.every((n) => typeof n === "string" && UUID_RE.test(n)))
      return { ok: false, reason: "연결 노드(nodes)는 Work Hierarchy 노드 id 20개까지" };
    if (nodesRaw.length) nodes = [...new Set(nodesRaw as string[])];
  }
  return { ok: true, spec: { widgets: out, ...(nodes ? { nodes } : {}) } };
}

export type TableSource = { kind: "table"; code: string; table: string };
/** 저장·삭제·등록 버튼이 쓸 수 있는지(서버 · 화면 같은 판정). 안 되면 첫 이유. */
export function writePlan(spec: UiSpec, buttonId: string): { ok: true; action: Action; source: TableSource; combo: Widget; numbers: Widget[] } | { ok: false; reason: string } {
  const b = spec.widgets.find((w) => w.id === buttonId);
  if (!b || b.type !== "button" || !b.action || !WRITE_ACTIONS.includes(b.action)) return { ok: false, reason: "저장·삭제·등록 버튼이 아닙니다" };
  const t = spec.widgets.find((w) => w.id === b.target);
  if (!t || t.type !== "table" || t.source?.kind !== "table") return { ok: false, reason: `${b.id}: 대상 Table 에 동작 대상 Data(제품 표)가 정해지지 않았습니다` };
  const c = spec.widgets.find((w) => w.id === b.filterBy);
  if (!c || c.type !== "combo") return { ok: false, reason: `${b.id}: 어느 행인지 정할 Active Set-up(Combo box)이 필요합니다` };
  const numbers = spec.widgets.filter((w) => w.type === "number" && w.col);
  if (b.action !== "delete" && numbers.length === 0) return { ok: false, reason: `${b.id}: 쓸 값이 없습니다 — Number 위젯의 '쓰는 열'을 정하십시오` };
  return { ok: true, action: b.action, source: t.source, combo: c, numbers };
}

/** 표 한 행을 고친다(순수) — 등록 = 없는 Item 만 · 저장 = 있는 Item 만 · 삭제 = 있는 Item 만. 값은 유한한 수. */
export function applyRowWrite(
  table: { cols: { key: string }[]; rows: { item: string; cells: Record<string, unknown> }[] },
  action: Action, item: string, values: Record<string, number>,
): { ok: true; rows: { item: string; cells: Record<string, unknown> }[] } | { ok: false; status: number; reason: string } {
  if (!item) return { ok: false, status: 400, reason: "Active Set-up Combo 값(Item)을 먼저 고르십시오" };
  const keys = new Set(table.cols.map((c) => c.key));
  for (const [k, v] of Object.entries(values)) {
    if (!keys.has(k)) return { ok: false, status: 400, reason: `이 표에 없는 열: ${k}` };
    if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, status: 400, reason: `열 ${k}: 수가 아닙니다` };
  }
  const at = table.rows.findIndex((r) => r.item === item);
  if (action === "register") {
    if (at >= 0) return { ok: false, status: 409, reason: `이미 있는 Item: ${item} — 저장을 쓰십시오` };
    return { ok: true, rows: [...table.rows, { item, cells: { ...values } }] };
  }
  if (at < 0) return { ok: false, status: 404, reason: `없는 Item: ${item}` };
  if (action === "delete") return { ok: true, rows: table.rows.filter((_, i) => i !== at) };
  if (action === "save") return { ok: true, rows: table.rows.map((r, i) => (i === at ? { item: r.item, cells: { ...r.cells, ...values } } : r)) };
  return { ok: false, status: 400, reason: "쓰기 동작이 아닙니다" };
}

/** p26 Signal/Slot Editor — 지금 Set-up 에서 나오는 연결(읽기 전용 · 편집은 각 위젯 Set-up 에서). */
export function signalSlots(spec: UiSpec): { sender: string; signal: string; receiver: string; slot: string }[] {
  const out: { sender: string; signal: string; receiver: string; slot: string }[] = [];
  for (const w of spec.widgets) {
    if (w.type !== "button") continue;
    if (w.filterBy) out.push({ sender: w.filterBy, signal: "currentIndexChanged()", receiver: w.id, slot: "setActiveValue()" });
    if (w.action === "call" && w.call) out.push({ sender: w.id, signal: "clicked()", receiver: w.call.kind === "link" ? w.call.href : "Macro", slot: w.call.kind === "link" ? "open()" : "run()" });
    else if (w.target) out.push({ sender: w.id, signal: "clicked()", receiver: w.target, slot: `${w.action ?? "find"}()` });
  }
  for (const w of spec.widgets) if (w.type === "number" && w.col) out.push({ sender: w.id, signal: "valueChanged()", receiver: `열 ${w.col}`, slot: "setCell()" });
  return out;
}

/** Object Inspector — Qt Designer 와 같은 Object · Class 목록 */
export const CLASS_OF: Record<WidgetType, string> = { button: "QPushButton", combo: "QComboBox", table: "QTableWidget", label: "QLabel", number: "QDoubleSpinBox", canvas: "QChartView" };

/**
 * p25 [UI 개발 AI] — "개발하고자 하는 Application 의 설명을 주면 UI 를 자동 설계" + UI Templet 대화 상자(용도 · 항목 · 필요 DB Table).
 * 지금은 **결정론 설계기**다(AI 키 없음 → D-6 결정론 폴백). 같은 입력 → 같은 폼. 설명 글에서 낱말만 읽는다:
 *   찾(기 · 고 …)/검색/조회 · 초기화 · 복사 · 저장/수정 · 등록/추가 · 삭제 · 그래프/곡선/차트 · 매크로/계산.
 */
export interface DesignInput { purpose: string; items: string[]; table?: { code: string; table: string; cols: string[] } | null; text?: string }
export function designSpec(inp: DesignInput): { spec: UiSpec; notes: string[] } {
  const text = inp.text ?? "";
  const has = (...ws: string[]) => ws.some((w) => text.includes(w));
  const items = [...new Set(inp.items.filter((k) => /^[A-F]$/.test(k)))].slice(0, 4);
  const widgets: Widget[] = [];
  const notes: string[] = [];
  widgets.push({ id: "label1", type: "label", x: 0, y: 0, w: 12, h: 1, label: (inp.purpose || "UI Form").slice(0, 40) });
  items.forEach((k, i) => widgets.push({ id: `combo${i + 1}`, type: "combo", x: i * 5, y: 1, w: 5, h: 2, label: `Sub Code ${k}`, source: { kind: "subcode", itemKey: k } }));
  if (items.length) notes.push(`항목 ${items.join(" · ")} → Combo box ${items.length}개(선택지 = Sub Code)`);
  const t = inp.table;
  const acts: Action[] = [];
  if (t) {
    widgets.push({ id: "table1", type: "table", x: 0, y: 3, w: 14, h: 7, label: `${t.code}.${t.table}`, source: { kind: "table", code: t.code, table: t.table } });
    notes.push(`필요 DB Table ${t.code}.${t.table} → Table 위젯`);
    if (has("찾", "검색", "조회") || !text.trim()) acts.push("find");
    if (has("초기화")) acts.push("reset");
    if (has("복사")) acts.push("copy");
    if (has("저장", "수정")) acts.push("save");
    if (has("등록", "추가")) acts.push("register");
    if (has("삭제")) acts.push("delete");
    if (has("그래프", "곡선", "차트", "Canvas", "canvas")) {
      widgets.push({ id: "canvas1", type: "canvas", x: 14, y: 3, w: 10, h: 7, label: "Canvas", source: { kind: "table", code: t.code, table: t.table } });
      notes.push("설명에 그래프 → Canvas(같은 표를 그린다)");
    }
    if (acts.some((a) => a === "save" || a === "register")) {
      t.cols.slice(0, 4).forEach((c, i) => widgets.push({ id: `number${i + 1}`, type: "number", x: 14 + (i % 2) * 5, y: 10 + Math.floor(i / 2) * 3, w: 5, h: 3, label: `열 ${c}`, col: c }));
      notes.push(`저장·등록 → Number 위젯이 열 ${t.cols.slice(0, 4).join(" · ")} 에 쓴다`);
    }
  }
  if (has("매크로", "계산")) acts.push("call");
  acts.forEach((a, i) => {
    const b: Widget = { id: `button${i + 1}`, type: "button", x: (i % 3) * 4, y: 10 + Math.floor(i / 3) * 2, w: 4, h: 2, label: ACTION_LABEL[a], action: a };
    if (a === "call") b.call = { kind: "macro" };
    else if (t) { b.target = "table1"; if (items.length) b.filterBy = "combo1"; }
    widgets.push(b);
  });
  if (acts.length) notes.push(`설명의 낱말 → 버튼 ${acts.map((a) => ACTION_LABEL[a]).join(" · ")}`);
  if (!t && !items.length) notes.push("항목도 표도 없어 제목만 만들었습니다");
  return { spec: { widgets }, notes };
}

/** 누르기로 추가할 때: 그 크기가 다른 위젯과 겹치지 않는 첫 자리(위→아래, 왼→오른). 없으면 null. */
export function freeSpot(type: WidgetType, widgets: Widget[]): { x: number; y: number } | null {
  const [w, h] = DEFAULT_SIZE[type];
  const hit = (x: number, y: number) => widgets.some((q) => x < q.x + q.w && q.x < x + w && y < q.y + q.h && q.y < y + h);
  for (let y = 0; y + h <= GRID_H; y++) for (let x = 0; x + w <= GRID_W; x++) if (!hit(x, y)) return { x, y };
  return null;
}
