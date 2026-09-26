-- 0022 · Input Data 템플릿 (청사진 p16 [ERP / CPQ / Document Template] Input Data: Temperature °C · Humidity % · p47)
-- 회사가 문서(지금은 Tech Data)의 입력 항목을 정의한다: 이름 · 단위 · 기본값 · 범위.
-- Tech Data 를 만들 때 이 항목 값을 받아 문서 body 에 **스냅샷**으로 넣는다 — 템플릿을 나중에 바꿔도 발행된 문서의 숫자는 그대로다.
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "input_item";
CREATE TABLE "input_item" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "doc_type"      TEXT NOT NULL DEFAULT 'techdata' CHECK ("doc_type" IN ('techdata')),
  "seq"           INTEGER NOT NULL DEFAULT 0,
  "key"           TEXT NOT NULL CHECK ("key" ~ '^[a-z][a-z0-9_]{0,30}$'),
  "label"         TEXT NOT NULL CHECK (length("label") BETWEEN 1 AND 60),
  "unit"          TEXT NOT NULL DEFAULT '',
  "default_value" DOUBLE PRECISION,
  "min_value"     DOUBLE PRECISION,
  "max_value"     DOUBLE PRECISION,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by"    UUID NOT NULL,
  CONSTRAINT "input_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "input_item_range" CHECK ("min_value" IS NULL OR "max_value" IS NULL OR "min_value" <= "max_value")
);
CREATE UNIQUE INDEX "input_item_tenant_id_doc_type_key_key" ON "input_item" ("tenant_id","doc_type","key");

ALTER TABLE "input_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "input_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "input_item"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
