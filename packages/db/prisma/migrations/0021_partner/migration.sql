-- 0021 · Company DB — 고객 · 공급처 (청사진 p64 [ERP Set-up] Company DB: Customer · Supplier · p67 단가 Supplier)
-- 한 테이블 partner(kind) 로 둘을 담는다(같은 모양 · 같은 규칙). Warehouse · Inventory · Bank · Employee · Nation 은 아직 없음.
-- 연결은 NULL 허용 새 열로만: project.client_id → 고객, price_history.supplier_id → 공급처.
-- 기존 글자 열(project.client_name · price_history.supplier)은 그대로 둔다 — 화면에서 목록을 고르면 둘 다 채운다(옛 데이터 보존).
-- 추가만 하는 마이그레이션. 되돌리기:
--   ALTER TABLE "price_history" DROP COLUMN "supplier_id"; ALTER TABLE "project" DROP COLUMN "client_id"; DROP TABLE "partner";
CREATE TABLE "partner" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "kind"       TEXT NOT NULL CHECK ("kind" IN ('customer','supplier')),
  "code"       TEXT NOT NULL CHECK (length("code") BETWEEN 1 AND 40),
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 120),
  "contact"    TEXT NOT NULL DEFAULT '',
  "nation"     TEXT NOT NULL DEFAULT '',
  "remarks"    TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_tenant_id_kind_code_key" ON "partner" ("tenant_id","kind","code");

ALTER TABLE "partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "partner"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "project" ADD COLUMN "client_id" UUID REFERENCES "partner"("id") ON DELETE SET NULL;
ALTER TABLE "price_history" ADD COLUMN "supplier_id" UUID REFERENCES "partner"("id") ON DELETE SET NULL;
