import type { Expr, Macro, Condition, TableCall } from "./ast";

/**
 * STEP 5 — 역번역 (Macro DSL → 사람이 읽는 설명 + 흐름도). EDIM.pdf p27의
 * "Flowchart ↔ Macro ↔ Description" 보기 중 Macro에서 나가는 두 방향.
 *
 * 결정론: AST만 읽는다. LLM·네트워크·DB 없음. 같은 매크로 → 같은 설명·같은 흐름도.
 * 승인자가 "이 식이 실제로 무엇을 계산하는가"를 식을 몰라도 확인하게 하는 것이 목적이므로
 * 실행기의 의미를 그대로 옮긴다(예: 연산자는 우선순위 없이 왼쪽부터 — 괄호로 드러낸다,
 * IF 조건의 코드 여러 개는 '모두' 만족).
 *
 * 용어집(glossary)은 선택: 표·변수·코드의 회사 말 이름. 없으면 기호 그대로 쓴다.
 */
export interface Glossary {
  /** key `${tableId}!${col}` */
  readonly tables?: Readonly<Record<string, string>>;
  /** key `${namespace}|${id}` */
  readonly vars?: Readonly<Record<string, string>>;
  readonly codes?: Readonly<Record<string, string>>;
}

export type FlowNode =
  | { readonly kind: "decision"; readonly label: string; readonly yes: FlowNode; readonly no: FlowNode }
  | { readonly kind: "process"; readonly label: string };

export interface MacroDescription {
  readonly text: string;
  readonly flow: FlowNode;
  /** every external symbol the macro reads — what an approver should check */
  readonly reads: { readonly tables: string[]; readonly vars: string[]; readonly codes: string[] };
}

const CMP: Record<Condition["comparator"], string> = {
  ">": "보다 크면", "<": "보다 작으면", ">=": " 이상이면", "<=": " 이하이면", "=": "와 같으면", "<>": "와 다르면",
};
const OP: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const AGG: Record<string, string> = { SUM: "합", MIN: "최솟값", MAX: "최댓값", AVG: "평균" };

class Ctx {
  readonly tables = new Set<string>();
  readonly vars = new Set<string>();
  readonly codes = new Set<string>();
  constructor(readonly g: Glossary) {}

  table(t: TableCall, col = t.col): string {
    const key = `${t.tableId}!${col}`;
    this.tables.add(key);
    const name = this.g.tables?.[key];
    const [a, b] = t.rowRange;
    const rows = a === b ? `${a}행` : `${a}~${b}행`;
    return `표${t.tableId}의 ${col}열${name ? `(${name})` : ""} ${rows}`;
  }
  code(name: string): string {
    this.codes.add(name);
    const n = this.g.codes?.[name];
    return n ? `${n}(${name})` : name;
  }
  cond(c: Condition): string {
    const names = [...new Set(c.refs.map((r) => r.name))].map((n) => this.code(n));
    const lit = c.literal.type === "Number" ? String(c.literal.value) : `"${c.literal.value}"`;
    const subject = names.length > 1 ? `${names.join("·")}이(가) 모두` : `${names[0]}이(가)`;
    return `${subject} ${lit}${CMP[c.comparator]}`;
  }
  expr(e: Expr, nested = false): string {
    switch (e.type) {
      case "Number":
        return String(e.value);
      case "String":
        return `"${e.value}"`;
      case "Binary": {
        const s = `${this.expr(e.left, true)} ${OP[e.op]} ${this.expr(e.right, true)}`;
        return nested ? `(${s})` : s;
      }
      case "If":
        return `만약 ${this.cond(e.cond)} ${this.expr(e.then, true)}, 아니면 ${this.expr(e.otherwise, true)}`;
      case "TableCall":
        return this.table(e);
      case "Agg":
        return `${this.table(e.table)}의 ${AGG[e.fn]}`;
      case "VarCall": {
        const key = `${e.namespace}|${e.id}`;
        this.vars.add(key);
        const n = this.g.vars?.[key];
        return `변수 ${e.namespace}·${e.id}${e.cell ? `·${e.cell}` : ""}${n ? `(${n})` : ""}`;
      }
      case "PreC":
        return `PreC(${e.arg})`;
      case "Lookup":
        return `${this.table(e.table)}에서 값이 ${this.expr(e.key, true)}인 행의 ${e.col}열${this.g.tables?.[`${e.table.tableId}!${e.col}`] ? `(${this.g.tables[`${e.table.tableId}!${e.col}`]})` : ""}`;
      case "Round":
        return `${this.expr(e.value, true)}을(를) 소수 ${e.digits}자리로 반올림`;
      case "Logic":
        return `${e.conds.map((c) => this.cond(c).replace(/면$/, "")).join(e.op === "AND" ? " 그리고 " : " 또는 ")} → 참이면 1, 아니면 0`;
      case "Address":
        return `주소 ${e.value}의 값`;
    }
  }
  flow(e: Expr): FlowNode {
    if (e.type === "If")
      return { kind: "decision", label: this.cond(e.cond).replace(/(이면|으면|면)$/, "?").replace(/보다 크\?$/, "보다 큰가?").replace(/보다 작\?$/, "보다 작은가?"), yes: this.flow(e.then), no: this.flow(e.otherwise) };
    return { kind: "process", label: this.expr(e) };
  }
}

export function describe(macro: Macro, glossary: Glossary = {}): MacroDescription {
  const ctx = new Ctx(glossary);
  const body = ctx.expr(macro.body);
  const run = macro.run ? (macro.run.target.kind === "number" ? ` → Run ${macro.run.target.value}` : ` → Run ${macro.run.target.ref}`) : "";
  const flow = ctx.flow(macro.body);
  return {
    text: `결과 = ${body}${run}`,
    flow,
    reads: { tables: [...ctx.tables].sort(), vars: [...ctx.vars].sort(), codes: [...ctx.codes].sort() },
  };
}
