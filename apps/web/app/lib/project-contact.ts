/** 0023 · p12 Client 담당자 · 영업 활동 입력 검사(한 곳 — 추가·수정 API 가 같이 쓴다). */
const s = (v: unknown, max: number): string | undefined => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export function contactInput(b: Record<string, unknown>, create: boolean):
  { name?: string; department?: string; contact?: string; isPrimary?: boolean } | { error: string } {
  const name = s(b.name, 60), department = s(b.department, 60), contact = s(b.contact, 120);
  if (create && !name) return { error: "담당자 이름 필수" };
  if (!create && b.name !== undefined && !name) return { error: "담당자 이름은 비울 수 없습니다" };
  if (b.isPrimary !== undefined && typeof b.isPrimary !== "boolean") return { error: "isPrimary 는 true/false" };
  return { ...(name ? { name } : {}), ...(department !== undefined ? { department } : {}), ...(contact !== undefined ? { contact } : {}),
    ...(typeof b.isPrimary === "boolean" ? { isPrimary: b.isPrimary } : {}) };
}

export const ACTIVITY_KINDS: Record<string, string> = { visit: "방문", call: "통화", mail: "메일", meeting: "회의", etc: "기타" };

export function activityInput(b: Record<string, unknown>): { date: string; kind: string; content: string } | { error: string } {
  const date = s(b.date, 10) ?? "", kind = s(b.kind, 10) ?? "", content = s(b.content, 2000) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: "날짜는 YYYY-MM-DD" };
  if (!(kind in ACTIVITY_KINDS)) return { error: `종류는 ${Object.keys(ACTIVITY_KINDS).join("·")}` };
  if (!content) return { error: "내용 필수" };
  return { date, kind, content };
}
