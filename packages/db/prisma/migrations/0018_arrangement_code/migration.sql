-- 0018 · Arrangement Code Registration (청사진 p35 [Set-up / Arrangement Code] · S-1-5)
-- 제품 배치(구획 순서 · 길이 · 방향 · 부품 위치)를 이름 붙은 코드로 등록하고 승인 절차를 거친다:
--   등록 = pending → 승인(approved) 또는 반려(rejected). 결정은 한 번뿐(되돌리기는 새 코드로).
--   승인된 코드만 제품 코드에 "적용"할 수 있고, 적용은 기존 Arrangement 저장 경로를 그대로 탄다(BOM 관계 잠금 등 규칙이 한 곳).
-- sections 는 등록 시점의 스냅샷 — 나중에 제품 배치가 바뀌어도 코드는 그대로다.
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "arrangement_code".
CREATE TABLE "arrangement_code" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code"          TEXT NOT NULL CHECK (length("code") BETWEEN 1 AND 40),
  "product_code"  TEXT NOT NULL,
  "description"   TEXT NOT NULL DEFAULT '',
  "sections"      JSONB NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','approved','rejected')),
  "requested_by"  UUID NOT NULL,
  "decided_by"    UUID,
  "decided_at"    TIMESTAMPTZ(6),
  "decision_note" TEXT,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "arrangement_code_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "arrangement_code_decided" CHECK (("status" = 'pending') = ("decided_at" IS NULL))
);
CREATE UNIQUE INDEX "arrangement_code_tenant_id_code_key" ON "arrangement_code" ("tenant_id","code");

ALTER TABLE "arrangement_code" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "arrangement_code" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "arrangement_code"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
