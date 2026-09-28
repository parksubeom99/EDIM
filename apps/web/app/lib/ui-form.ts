/**
 * p25·p26 사용자 UI Form 의 모양(spec)과 검증 — 화면(설계·실행)과 API 가 같이 쓴다.
 * 격자 24 × 16 칸. 위젯 최대 40개. 참조(대상·Active Set-up)는 같은 폼 안의 위젯만.
 */
export const GRID_W = 24;
export const GRID_H = 16;
export const WIDGET_TYPES = ["button", "combo", "table", "label", "number"] as const;   // number = 숫자 입력(C · Special 입력 폼 — param 으로 계산 입력에 잇는다)
export type WidgetType = (typeof WIDGET_TYPES)[number];
export const ACTIONS = ["find", "reset", "copy"] as const;   // 찾기 · 초기화 · 복사 (저장·삭제·등록은 아직 — 대상 데이터의 쓰기 규칙이 먼저 필요)
export type Action = (typeof ACTIONS)[number];
export const ACTION_LABEL: Record<Action, string> = { find: "찾기", reset: "초기화", copy: "복사" };
export const SCOPES = ["CPQ · Selection", "Technical", "Document", "Design Management", "Purchasing"] as const;

export type Source = { kind: "subcode"; itemKey: string } | { kind: "table"; code: string; table: string };
export interface Widget {
  id: string; type: WidgetType; x: number; y: number; w: number; h: number; label: string;
  source?: Source; action?: Action; target?: string; filterBy?: string;
  /** number 위젯 — 계산이 읽는 입력 이름(예: q_cmh · p_pa · rho) · 단위 표시 */
  param?: string; unit?: string;
}
export interface UiSpec { widgets: Widget[] }

const DEFAULT_SIZE: Record<WidgetType, [number, number]> = { button: [4, 2], combo: [5, 2], table: [12, 6], label: [6, 1], number: [6, 3] };
export function newWidget(type: WidgetType, x: number, y: number, taken: Set<string>): Widget {
  let n = 1; while (taken.has(`${type}${n}`)) n++;
  const [w, h] = DEFAULT_SIZE[type];
  return { id: `${type}${n}`, type, x: Math.max(0, Math.min(GRID_W - w, x)), y: Math.max(0, Math.min(GRID_H - h, y)), w, h,
    label: type === "button" ? "찾기" : type === "combo" ? `S-${n}` : type === "table" ? "동작 대상 Data" : type === "number" ? `입력 ${n}` : "Label",
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
      else if (src.kind === "table" && typeof src.code === "string" && typeof src.table === "string" && wd.type === "table") wd.source = { kind: "table", code: src.code.slice(0, 20), table: src.table.slice(0, 20) };
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
    if (typeof raw.target === "string" && raw.target) wd.target = raw.target;
    if (typeof raw.filterBy === "string" && raw.filterBy) wd.filterBy = raw.filterBy;
    out.push(wd);
  }
  const byId = new Map(out.map((w) => [w.id, w]));
  for (const w of out) {
    if (w.target && byId.get(w.target)?.type !== "table") return { ok: false, reason: `${w.id}: 대상은 Table 위젯이어야 합니다` };
    if (w.filterBy && byId.get(w.filterBy)?.type !== "combo") return { ok: false, reason: `${w.id}: Active Set-up 은 Combo box 위젯이어야 합니다` };
  }
  return { ok: true, spec: { widgets: out } };
}

/** 누르기로 추가할 때: 그 크기가 다른 위젯과 겹치지 않는 첫 자리(위→아래, 왼→오른). 없으면 null. */
export function freeSpot(type: WidgetType, widgets: Widget[]): { x: number; y: number } | null {
  const [w, h] = DEFAULT_SIZE[type];
  const hit = (x: number, y: number) => widgets.some((q) => x < q.x + q.w && q.x < x + w && y < q.y + q.h && q.y < y + h);
  for (let y = 0; y + h <= GRID_H; y++) for (let x = 0; x + w <= GRID_W; x++) if (!hit(x, y)) return { x, y };
  return null;
}
