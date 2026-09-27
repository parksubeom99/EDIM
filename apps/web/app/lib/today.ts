/**
 * "오늘" 날짜(YYYY-MM-DD) — 한 곳.
 *
 * `new Date().toISOString().slice(0, 10)` 은 **UTC** 날짜다. 한국(UTC+9)에서는 00시~09시 사이에 어제가 되어
 * 오늘 유효한 단가가 "예정"으로 보이는 결함이 났다(2026-09-27 00:21 KST 머지 게이트 실측 · e2e S45d).
 *
 * businessToday : 서버 판정용 — 회사 시간대(EDIM_TZ, 기본 Asia/Seoul)의 오늘
 * localToday    : 화면 기본값용 — 이 브라우저(사용자)의 현지 오늘
 */
export const EDIM_TZ = process.env.EDIM_TZ || "Asia/Seoul";

export function businessToday(now: Date = new Date(), timeZone: string = EDIM_TZ): string {
  // en-CA 는 YYYY-MM-DD 로 찍는다
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** 어떤 시각(생성일 등)의 회사 시간대 날짜 — businessToday 와 같은 Intl 방식(한 곳). */
export function businessDateOf(at: Date | string, timeZone: string = EDIM_TZ): string {
  return businessToday(at instanceof Date ? at : new Date(at), timeZone);
}

export function localToday(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * DB 의 DATE 열(Prisma 가 UTC 자정 Date 로 준다) → YYYY-MM-DD. "오늘"을 구하는 함수가 아니다 —
 * 저장된 날짜를 그대로 글자로 바꿀 뿐이라 UTC 부분을 읽는 것이 맞다.
 */
export function dateOnly(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
