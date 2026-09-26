-- 0017 · 단가 이력 (청사진 p32 "G : Price — Table 참조" · p67 Cost / Price Table)
-- 구매품(자재) 코드의 단가를 날짜별로 쌓는다. 한 번 적은 단가는 고치지 않는다 — 바뀌면 새 행(유효일)을 쌓는다.
-- 현재 단가는 따로 저장하지 않고 "오늘까지 유효한 가장 최근 행"으로 읽는다(값은 한 곳).
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "price_history".
CREATE TABLE "price_history" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code"           TEXT NOT NULL,
  "item"           TEXT NOT NULL DEFAULT '',
  "price"          DECIMAL(14,2) NOT NULL CHECK ("price" > 0),
  "currency"       TEXT NOT NULL DEFAULT 'KRW' CHECK ("currency" IN ('KRW','USD','EUR','JPY','CNY')),
  "supplier"       TEXT NOT NULL DEFAULT '',
  "effective_from" DATE NOT NULL,
  "note"           TEXT,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by"     UUID NOT NULL,
  CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_history_tenant_id_code_item_effective_from_idx" ON "price_history" ("tenant_id","code","item","effective_from");

ALTER TABLE "price_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "price_history"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
