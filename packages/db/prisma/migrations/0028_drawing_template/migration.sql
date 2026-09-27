-- 0028 · p39 도면 Templet 호출 설정 · p40 Call Sub Drawing · Detail Design
-- 제품 코드마다 도면 템플릿 항목 두 종류:
--   sub  = 하부 도면(Sub Drawing) 호출 — 하위 코드(child_code) + 설계 우선순위(priority, 작을수록 먼저 · 같으면 코드 순)
--   note = Detail Design 주의사항 — 도면에 붙는 문구(text), priority 순
-- 도면을 뜨는 순간 그 BOM 스냅샷에 실제로 있는 하위 코드만 골라 drawing.meta 에 박는다 — 템플릿을 나중에 고쳐도 뜬 도면은 그대로.
-- 새 도면 계산은 없다(스냅샷 줄 · 등록된 DWG 첨부만 읽는다).
-- 추가만 하는 마이그레이션(새 테이블). 되돌리기: DROP TABLE "drawing_template_item";
CREATE TABLE "drawing_template_item" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "product_code" TEXT NOT NULL CHECK (length("product_code") BETWEEN 1 AND 40),
  "kind"         TEXT NOT NULL CHECK ("kind" IN ('sub','note')),
  "child_code"   TEXT,
  "text"         TEXT,
  "priority"     INTEGER NOT NULL CHECK ("priority" BETWEEN 1 AND 999),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by"   UUID NOT NULL,
  CONSTRAINT "drawing_template_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drawing_template_item_shape" CHECK (
    ("kind" = 'sub'  AND "child_code" IS NOT NULL AND length("child_code") BETWEEN 1 AND 40 AND "text" IS NULL) OR
    ("kind" = 'note' AND "text" IS NOT NULL AND length("text") BETWEEN 1 AND 200 AND "child_code" IS NULL))
);
CREATE UNIQUE INDEX "drawing_template_item_sub_key" ON "drawing_template_item" ("tenant_id","product_code","child_code") WHERE "kind" = 'sub';
CREATE INDEX "drawing_template_item_product_idx" ON "drawing_template_item" ("tenant_id","product_code");

ALTER TABLE "drawing_template_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drawing_template_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "drawing_template_item"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON "drawing_template_item" TO edim_app;
REVOKE UPDATE ON "drawing_template_item" FROM edim_app;  -- 고치기 = 지우고 새로
