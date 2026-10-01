/** ccmd P · 4-2 — 운영 모드인데 EDIM_PUBLIC_URL 이 없으면 서버 시작 때 경고 1줄(QR 주소가 요청 Host 를 따라간다 · DEPLOY.md). */
export function register(): void {
  if (process.env.NODE_ENV === "production" && !process.env.EDIM_PUBLIC_URL?.trim())
    console.warn("[EDIM] EDIM_PUBLIC_URL 미설정 — 공개 배포에서는 필수입니다. 없으면 인쇄본 QR 주소가 요청 Host 헤더를 따라갑니다(docs/DEPLOY.md).");
}
