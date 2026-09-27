-- 0027 · p64 [ERP Set-up] 기준정보 6종 — Department Std. · Warehouse · Inventory · Bank · Employee · Nation
-- 한 테이블 erp_master(kind) 에 담는다(같은 모양 · 같은 규칙 — 0021 partner 와 같은 방식). 종류별 칸은 attrs(JSONB)에,
-- 칸의 모양과 서로 가리키는 관계(Employee → Department · Inventory → Warehouse · Department → 상위 Department · Bank → Nation)는
-- 앱 한 곳(app/lib/erp-master.ts)이 검사한다. 가리키는 행이 있으면 삭제 409 — 대신 사용 중지(active=false).
-- 값은 회사가 채운다(시드는 예시 두 행뿐). 추가만 하는 마이그레이션(새 테이블). 되돌리기: DROP TABLE "erp_master";
CREATE TABLE "erp_master" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "kind"       TEXT NOT NULL CHECK ("kind" IN ('department','warehouse','inventory','bank','employee','nation')),
  "code"       TEXT NOT NULL CHECK (length("code") BETWEEN 1 AND 40),
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 120),
  "attrs"      JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof("attrs") = 'object'),
  "remarks"    TEXT NOT NULL DEFAULT '',
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "erp_master_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "erp_master_tenant_id_kind_code_key" ON "erp_master" ("tenant_id","kind","code");

ALTER TABLE "erp_master" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "erp_master" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "erp_master"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "erp_master" TO edim_app;
