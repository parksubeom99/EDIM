-- 0019 · Spec List in-put table (청사진 p46 [Set-up / CPQ / Selection] · S-3-1 "각각의 사양 입력")
-- 회사가 제품 코드마다 사양 항목(이름 · 단위 · 정하는 슬롯 · 값을 읽는 곳)을 정의한다.
-- 사양 값 → 슬롯 추천은 이미 등록된 Sub Code · 제품 표(Table 참조)에서만 고른다(새 값을 만들지 않는다).
-- 추천 결과의 저장은 기존 Code Builder 개정(code_revision) 경로 한 곳.
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "spec_item".
CREATE TABLE "spec_item" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "product_code" TEXT NOT NULL,
  "seq"          INTEGER NOT NULL DEFAULT 0,
  "key"          TEXT NOT NULL CHECK ("key" ~ '^[a-z][a-z0-9_]{0,30}$'),
  "label"        TEXT NOT NULL CHECK (length("label") BETWEEN 1 AND 60),
  "unit"         TEXT NOT NULL DEFAULT '',
  "slot"         TEXT NOT NULL CHECK ("slot" IN ('A','B','C','D','E','F')),
  "source"       JSONB NOT NULL,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by"   UUID NOT NULL,
  CONSTRAINT "spec_item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "spec_item_tenant_id_product_code_key_key" ON "spec_item" ("tenant_id","product_code","key");

ALTER TABLE "spec_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spec_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "spec_item"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
