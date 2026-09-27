-- 0026 · p66 [Work Process management] Manufacturing Cost Table · p67 제조 정보(시간 · 임율 · 장비)
-- 제품 코드마다 공정별 시간(h) · 임율(원/h) · 장비(이름, 선택). 등록돼 있으면 BOM Run 의 인건비 = Σ 시간 × 임율,
-- 없으면 기존 재료비 × 18%. 어느 쪽으로 셌는지는 BOM 스냅샷 cost.laborBasis 에 박힌다 — 표를 나중에 바꿔도 뜬 스냅샷·견적은 그대로.
-- 장비는 이름만 적는다(설비 사용료는 회사 설비 데이터가 들어와야 한다 — 아직 없음).
-- 추가만 하는 마이그레이션(새 테이블). 되돌리기: DROP TABLE "mfg_rate";
CREATE TABLE "mfg_rate" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "product_code" TEXT NOT NULL CHECK (length("product_code") BETWEEN 1 AND 40),
  "seq"          INTEGER NOT NULL DEFAULT 0,
  "process"      TEXT NOT NULL CHECK (length("process") BETWEEN 1 AND 60),
  "equipment"    TEXT CHECK ("equipment" IS NULL OR length("equipment") BETWEEN 1 AND 80),
  "hours"        NUMERIC(8,2) NOT NULL CHECK ("hours" > 0),
  "rate"         NUMERIC(12,2) NOT NULL CHECK ("rate" > 0),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by"   UUID NOT NULL,
  CONSTRAINT "mfg_rate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mfg_rate_tenant_id_product_code_process_key" ON "mfg_rate" ("tenant_id","product_code","process");

ALTER TABLE "mfg_rate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mfg_rate" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "mfg_rate"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON "mfg_rate" TO edim_app;
REVOKE UPDATE ON "mfg_rate" FROM edim_app;  -- 고치려면 지우고 새로 넣는다(뜬 스냅샷은 laborBasis 를 따로 갖고 있다)
