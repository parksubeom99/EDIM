/**
 * RCCS™ Code Builder — A~F slot catalog + deterministic assembly/validation.
 *
 * Grammar (confirmed 2026-07-14, 사장님 D1~D4):
 *  - prefix (A) EU/ER/EC = product-category codes (EU=AHU is an example value)
 *  - trailing number groups (F) = slot selection sequence (e.g. 1-21-13-15)
 *  - corpus samples: `EU-55-2123-A1`, `ER-12-0480`, `EU 10 Cos2 FES-PreC 1-21-13-15`
 *
 * This catalog is a *sample* seeded from corpus samples. Real catalog values are
 * injected by the platform owner; persistence of assembled codes needs a schema
 * decision (Tier B, M2) — M1 only assembles + validates live (D3).
 */

export type SlotKey = "A" | "B" | "C" | "D" | "E" | "F";

export interface SlotOption {
  value: string;
  label: string;
}

export interface SlotDef {
  key: SlotKey;
  name: string;
  hint: string;
  required: boolean;
  options: readonly SlotOption[];
}

export const RCCS_SLOTS: readonly SlotDef[] = [
  {
    key: "A",
    name: "제품군",
    hint: "접두 코드 — 제품 카테고리",
    required: true,
    options: [
      { value: "EU", label: "EU · AHU (공기조화기)" },
      { value: "ER", label: "ER · 환기 유닛" },
      { value: "EC", label: "EC · 냉각 코일 유닛" },
    ],
  },
  {
    key: "B",
    name: "용량",
    hint: "풍량 등급",
    required: true,
    options: [
      { value: "10", label: "10 · 10,000 CMH" },
      { value: "12", label: "12 · 12,000 CMH" },
      { value: "25", label: "25 · 25,000 CMH" },
      { value: "55", label: "55 · 55,000 CMH" },
    ],
  },
  {
    key: "C",
    name: "시리즈",
    hint: "기본 사양 시리즈",
    required: true,
    options: [
      { value: "0480", label: "0480 · 표준 단열 패널" },
      { value: "2123", label: "2123 · 이중 단열 패널" },
      { value: "3110", label: "3110 · 위생형" },
    ],
  },
  {
    key: "D",
    name: "옵션",
    hint: "부가 기능",
    required: false,
    options: [
      { value: "", label: "— 없음" },
      { value: "630", label: "630 · 열회수 로터" },
      { value: "A1", label: "A1 · 가습 모듈" },
      { value: "H2", label: "H2 · 히트 펌프" },
    ],
  },
  {
    key: "E",
    name: "재질",
    hint: "외판 · 코팅",
    required: false,
    options: [
      { value: "", label: "— 기본 (GI)" },
      { value: "SS", label: "SS · 스테인리스" },
      { value: "AL", label: "AL · 알루미늄" },
    ],
  },
  {
    key: "F",
    name: "슬롯 순번",
    hint: "슬롯 선택 순서 (후행 숫자군)",
    required: false,
    options: [
      { value: "", label: "— 없음" },
      { value: "1-21-13-15", label: "1-21-13-15" },
      { value: "1-21-13-16", label: "1-21-13-16" },
      { value: "2-11-08-04", label: "2-11-08-04" },
    ],
  },
] as const;

export type SlotValues = Partial<Record<SlotKey, string>>;

export interface AssembleDiagnostic {
  slot: SlotKey | null;
  severity: "error" | "warn";
  message: string;
}

export interface AssembleResult {
  code: string;
  ok: boolean;
  diagnostics: AssembleDiagnostic[];
}

const SEQ_RE = /^\d+(-\d+)*$/;

/** Deterministic: same slots → same code. No side effects, no I/O. */
export function assembleCode(values: SlotValues, slotDefs: readonly SlotDef[] = RCCS_SLOTS): AssembleResult {
  const diagnostics: AssembleDiagnostic[] = [];
  const get = (k: SlotKey) => (values[k] ?? "").trim();

  for (const s of slotDefs) {
    const v = get(s.key);
    if (s.required && v === "") {
      diagnostics.push({
        slot: s.key,
        severity: "error",
        message: `${s.key} ${s.name} 필수`,
      });
      continue;
    }
    if (v !== "" && !s.options.some((o) => o.value === v)) {
      diagnostics.push({
        slot: s.key,
        severity: "error",
        message: `${s.key} ${s.name}: 카탈로그에 없는 값 '${v}'`,
      });
    }
  }

  const f = get("F");
  if (f !== "" && !SEQ_RE.test(f)) {
    diagnostics.push({
      slot: "F",
      severity: "error",
      message: "F 슬롯 순번 형식 오류 (예: 1-21-13-15)",
    });
  }
  if (get("A") === "EC" && get("D") === "630") {
    diagnostics.push({
      slot: "D",
      severity: "warn",
      message: "EC 제품군에 열회수 로터(630) 조합은 검토 필요",
    });
  }

  const head = [get("A"), get("B"), get("C")].filter(Boolean).join("-");
  const opt = `${get("D")}${get("E")}`;
  const parts = [head, opt, f].filter((p) => p !== "");
  const code = parts.join("-");

  return {
    code,
    ok: !diagnostics.some((d) => d.severity === "error"),
    diagnostics,
  };
}

export interface RegisteredSubCode { itemKey: string; itemName: string; seq: number; value: string; description: string }

/**
 * P1 — the Code Builder's choices come from the Set-Up DB (p31 Sub Code), not
 * from this file. Item name = the registered item name; options = registered
 * sub items in seq order. `required`/`hint` stay grammar facts (A·B·C required).
 * An item with no registered sub items keeps the sample options, so an empty
 * tenant still gets a working builder (documented fallback, sample only).
 */
export function slotDefsFromSubCodes(subCodes: readonly RegisteredSubCode[]): SlotDef[] {
  return RCCS_SLOTS.map((base) => {
    const rows = subCodes.filter((s) => s.itemKey === base.key).sort((a, b) => a.seq - b.seq);
    if (rows.length === 0) return base;
    const options: SlotOption[] = rows.map((r) => ({ value: r.value, label: r.description && r.description !== r.value ? `${r.value} · ${r.description}` : r.value }));
    const none = base.options.find((o) => o.value === "");
    return { ...base, name: rows[0]!.itemName || base.name, options: base.required || !none ? options : [none, ...options] };
  });
}

/** Parse a code back into slots (best effort; used for tests + inspector). */
export function parseCode(code: string): SlotValues {
  const segs = code.split("-");
  const out: SlotValues = {};
  if (segs[0]) out.A = segs[0];
  if (segs[1]) out.B = segs[1];
  if (segs[2]) out.C = segs[2];
  const rest = segs.slice(3);
  if (rest.length === 0) return out;
  const optCandidate = rest[0];
  if (optCandidate && /^\d+$/.test(optCandidate) && rest.length >= 2) {
    // ambiguous: numeric could be D or start of F; treat as F if all numeric
    out.F = rest.join("-");
    return out;
  }
  if (optCandidate && !/^\d+$/.test(optCandidate)) {
    const m = optCandidate.match(/^([0-9A-Z]{2,3}?)(SS|AL)?$/);
    if (m) {
      out.D = m[1] ?? "";
      if (m[2]) out.E = m[2];
    }
    if (rest.length > 1) out.F = rest.slice(1).join("-");
  } else if (optCandidate) {
    out.F = rest.join("-");
  }
  return out;
}
