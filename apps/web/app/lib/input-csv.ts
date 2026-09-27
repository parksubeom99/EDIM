import { parseCsv } from "./csv";

/**
 * F7 · p15 Tech Data 입력값 Import — CSV(머리글 key,value)를 템플릿 항목 값으로 읽는다(한 곳 · 화면이 쓴다).
 * 템플릿에 없는 key · 수가 아닌 값 · 중복 key 는 **파일의 줄 번호**와 함께 거부(하나라도 틀리면 아무것도 채우지 않는다).
 * 범위 검사는 문서를 만들 때 서버(resolveInputData)가 한다.
 */
export function importInputCsv(text: string, keys: string[]): { values: Record<string, string> } | { error: string } {
  const p = parseCsv(text);
  if ("error" in p) return { error: p.error };
  if (!p.header.includes("key") || !p.header.includes("value")) return { error: "머리글은 key,value" };
  const values: Record<string, string> = {};
  const bad: string[] = [];
  for (const r of p.rows) {
    const k = r.cells.key ?? "", v = r.cells.value ?? "";
    if (!keys.includes(k)) bad.push(`${r.line}번째 줄: 템플릿에 없는 항목 ${k || "(빈 key)"}`);
    else if (v === "" || !Number.isFinite(Number(v))) bad.push(`${r.line}번째 줄: ${k} 값이 수가 아님 (${v})`);
    else if (k in values) bad.push(`${r.line}번째 줄: ${k} 중복`);
    else values[k] = v;
  }
  return bad.length ? { error: `CSV 거부 — ${bad.join(" · ")}` } : { values };
}
