/**
 * H8 · p57 함수 마법사 — v1 함수셋 13개(IF · Table · Var · PreC · Run · SUM · MIN · MAX · AVG · LOOKUP · ROUND · AND · OR)를
 * 골라 인자 칸을 채우면 매크로 식 글자가 만들어진다. 여기서는 **글자만** 만든다 — 맞는지는 기존 파서(@edim/macro-dsl · /api/macros/describe)가,
 * 저장·승인은 기존 Macro 탭(Verify → Save draft → 승인)이 한다. 새 문법·새 함수는 없다(grammar v1.0 그대로).
 */
export type ArgKind = "expr" | "cond" | "table" | "ident" | "int" | "col" | "target";
export interface ArgDef { key: string; label: string; kind: ArgKind; ph: string }
export interface FuncDef { fn: string; group: "논리" | "참조" | "집계" | "수학" | "실행"; desc: string; args: ArgDef[]; note?: string }

export const FUNCS: FuncDef[] = [
  { fn: "IF", group: "논리", desc: "조건이 맞으면 앞 값, 아니면 뒤 값", args: [
    { key: "cond", label: "조건 (코드 비교)", kind: "cond", ph: "CAP>25" },
    { key: "then", label: "맞을 때", kind: "expr", ph: "SUM(Table1(A,4:4))" },
    { key: "else", label: "아닐 때", kind: "expr", ph: "0" }] },
  { fn: "AND", group: "논리", desc: "조건 여러 개가 모두 맞는가", args: [
    { key: "c1", label: "조건 1", kind: "cond", ph: "CAP>25" }, { key: "c2", label: "조건 2", kind: "cond", ph: "MAT=\"SS\"" }] },
  { fn: "OR", group: "논리", desc: "조건 중 하나라도 맞는가", args: [
    { key: "c1", label: "조건 1", kind: "cond", ph: "CAP>25" }, { key: "c2", label: "조건 2", kind: "cond", ph: "CAP<10" }] },
  { fn: "Table", group: "참조", desc: "등록 표의 열 · 행 범위를 읽는다", args: [
    { key: "no", label: "표 번호 N (TableN)", kind: "int", ph: "1" }, { key: "col", label: "열", kind: "col", ph: "A" },
    { key: "r0", label: "시작 행", kind: "int", ph: "1" }, { key: "r1", label: "끝 행", kind: "int", ph: "4" }] },
  { fn: "Var", group: "참조", desc: "변수 표의 값(namespace · id)", args: [
    { key: "ns", label: "namespace", kind: "ident", ph: "NS" }, { key: "id", label: "id", kind: "ident", ph: "15" }] },
  { fn: "LOOKUP", group: "참조", desc: "키로 표에서 찾아 다른 열 값을 돌려준다", args: [
    { key: "key", label: "찾을 값", kind: "expr", ph: "55" }, { key: "table", label: "표 범위", kind: "table", ph: "Table1(A,1:4)" },
    { key: "col", label: "돌려줄 열", kind: "col", ph: "B" }] },
  { fn: "SUM", group: "집계", desc: "표 범위의 합", args: [{ key: "table", label: "표 범위", kind: "table", ph: "Table1(A,1:4)" }] },
  { fn: "MIN", group: "집계", desc: "표 범위의 최솟값", args: [{ key: "table", label: "표 범위", kind: "table", ph: "Table1(A,1:4)" }] },
  { fn: "MAX", group: "집계", desc: "표 범위의 최댓값", args: [{ key: "table", label: "표 범위", kind: "table", ph: "Table1(A,1:4)" }] },
  { fn: "AVG", group: "집계", desc: "표 범위의 평균", args: [{ key: "table", label: "표 범위", kind: "table", ph: "Table1(A,1:4)" }] },
  { fn: "ROUND", group: "수학", desc: "값을 소수 자릿수로 반올림", args: [
    { key: "value", label: "값", kind: "expr", ph: "SUM(Table1(A,1:4))" }, { key: "digits", label: "자릿수", kind: "int", ph: "1" }] },
  { fn: "PreC", group: "실행", desc: "예약 함수 — 읽기는 되지만 실행하지 않는다", note: "의미 미정(NOVA 확인 대기) — 승인해도 실행하면 RESERVED 로 멈춘다", args: [
    { key: "n", label: "정수", kind: "int", ph: "1" }] },
  { fn: "Run", group: "실행", desc: "식 끝에 붙는 실행 대상(번호 또는 항목)", args: [
    { key: "body", label: "식", kind: "expr", ph: "SUM(Table1(A,1:1))" }, { key: "target", label: "실행 대상", kind: "target", ph: "3" }] },
];

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COND = /^[A-Za-z_][A-Za-z0-9_]*(\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*\s*(>=|<=|<>|>|<|=)\s*(-?\d+(\.\d+)?|"[^"]*")$/;
const TABLE = /^Table\d+\(\s*[A-Za-z_][A-Za-z0-9_]*\s*,\s*\d+\s*:\s*\d+\s*(,\s*[A-Za-z_][A-Za-z0-9_]*\s*)?\)$/;

function check(a: ArgDef, v: string): string | null {
  if (!v) return `${a.label} 칸이 비었습니다`;
  switch (a.kind) {
    case "int": return /^\d+$/.test(v) ? null : `${a.label} 은(는) 0 이상의 정수`;
    case "col": return IDENT.test(v) ? null : `${a.label} 은(는) 열 이름(영문)`;
    case "ident": return /^[A-Za-z0-9_]+$/.test(v) ? null : `${a.label} 은(는) 영문·숫자`;
    case "cond": return COND.test(v) ? null : `${a.label} 은(는) '코드 비교값' 모양(예: CAP>25 · MAT="SS")`;
    case "table": return TABLE.test(v) ? null : `${a.label} 은(는) TableN(열,시작:끝) 모양`;
    case "target": return /^\d+$/.test(v) || IDENT.test(v) ? null : `${a.label} 은(는) 번호 또는 항목 이름`;
    default: return null;   // expr — 파서가 본다
  }
}

/** 인자로 함수 호출 글자를 만든다(= 없이). Run 은 식 뒤에 붙는 꼬리다. */
export function buildCall(fn: string, raw: Record<string, string>): { ok: true; text: string } | { ok: false; error: string } {
  const def = FUNCS.find((f) => f.fn === fn);
  if (!def) return { ok: false, error: `모르는 함수: ${fn}` };
  const v: Record<string, string> = {};
  for (const a of def.args) {
    const x = (raw[a.key] ?? "").trim();
    const e = check(a, x);
    if (e) return { ok: false, error: e };
    v[a.key] = x;
  }
  switch (fn) {
    case "IF": return { ok: true, text: `IF(${v.cond}, ${v.then}, ${v.else})` };
    case "AND": case "OR": return { ok: true, text: `${fn}(${v.c1}, ${v.c2})` };
    case "Table": {
      if (Number(v.r0) > Number(v.r1)) return { ok: false, error: "시작 행이 끝 행보다 큽니다" };
      return { ok: true, text: `Table${v.no}(${v.col},${v.r0}:${v.r1})` };
    }
    case "Var": return { ok: true, text: `Var(${v.ns},${v.id})` };
    case "LOOKUP": return { ok: true, text: `LOOKUP(${v.key}, ${v.table}, ${v.col})` };
    case "SUM": case "MIN": case "MAX": case "AVG": return { ok: true, text: `${fn}(${v.table})` };
    case "ROUND": return { ok: true, text: `ROUND(${v.value}, ${v.digits})` };
    case "PreC": return { ok: true, text: `PreC(${v.n})` };
    case "Run": return { ok: true, text: `${v.body} Run ${v.target}` };
    default: return { ok: false, error: `모르는 함수: ${fn}` };
  }
}

/** 매크로 한 줄 — 맨 앞 '=' 를 붙인다(이미 있으면 그대로). */
export const asMacro = (text: string) => (text.trim().startsWith("=") ? text.trim() : `=${text.trim()}`);
