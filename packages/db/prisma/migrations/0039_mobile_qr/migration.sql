-- 0039 · ccmd L · LA-3 — 모바일 업무 · QR(청사진 p69). 회장님 승인 2026-10-01(ccmd N · 마이그레이션 추가 허용).
-- 추가만: 공지(notice · 추가만 되는 기록) · QR 토큰(qr_token · 폐기는 revoked_at 한 칸만 바꾼다).
-- 회사 업무 표(DB②) — tenant_id + RLS ENABLE · FORCE + tenant_isolation. edim_platform 권한 0.
-- 토큰은 추측할 수 없는 임의값(앱이 crypto 32바이트 → base64url). /q/{토큰} 은 로그인 + 같은 회사만(RLS).
-- 되돌리기: DROP TABLE "qr_token"; DROP TABLE "notice";

CREATE TABLE "notice" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "title"      TEXT NOT NULL CHECK (length("title") BETWEEN 1 AND 80),
  "body"       TEXT NOT NULL DEFAULT '' CHECK (length("body") <= 500),
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "notice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_token" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "token"       TEXT NOT NULL CHECK ("token" ~ '^[A-Za-z0-9_-]{32,64}$'),
  "target_kind" TEXT NOT NULL CHECK ("target_kind" IN ('project', 'work_order', 'drawing')),
  "target_id"   UUID NOT NULL,
  "created_by"  UUID NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "revoked_at"  TIMESTAMPTZ(6) NULL,
  CONSTRAINT "qr_token_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "qr_token_token_key" UNIQUE ("token")
);
CREATE INDEX "qr_token_target_idx" ON "qr_token" ("tenant_id", "target_kind", "target_id");

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notice','qr_token'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I
      USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)$p$, t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
  END LOOP;
END $$;

REVOKE ALL ON "notice", "qr_token" FROM edim_app;
GRANT SELECT, INSERT ON "notice", "qr_token" TO edim_app;
GRANT UPDATE ("revoked_at") ON "qr_token" TO edim_app;
