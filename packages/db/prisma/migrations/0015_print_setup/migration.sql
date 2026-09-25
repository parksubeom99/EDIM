-- 0015 · Print Set-up Form (청사진 p48 [Set-Up / CPQ / Document / Print] · S-3-4)
-- 문서 종류(quotation · techdata)마다 회사가 인쇄 양식을 하나 정한다:
--   용지 크기 · 방향 · 여백 · Font · Font 크기 · 색상(칼라/흑백) · 머리글 · 바닥글 · 워터마크.
-- 모양만 정한다 — 문서 body(스냅샷에서 옮긴 숫자)는 인쇄 때 다시 계산하지 않는다(P4-b 원칙 그대로).
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "print_setup".
CREATE TABLE "print_setup" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "doc_type"   TEXT NOT NULL CHECK ("doc_type" IN ('quotation','techdata')),
  "settings"   JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_by" UUID NOT NULL,
  CONSTRAINT "print_setup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "print_setup_tenant_id_doc_type_key" ON "print_setup" ("tenant_id", "doc_type");

ALTER TABLE "print_setup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "print_setup" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "print_setup"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
