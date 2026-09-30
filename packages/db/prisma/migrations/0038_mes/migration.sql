-- 0038 · ccmd L · LA-2 — 생산 · 창고 · 품질(청사진 p43 · p44). 회장님 승인 2026-10-01(ccmd N · 마이그레이션 추가 허용).
-- 추가만: 프로젝트에 수량 · 납기 칸 둘 + 새 표 12개 + 트리거 함수 하나. 기존 표 · 열 · 제약은 그대로.
-- 전부 회사 업무 표(DB②) — tenant_id + RLS ENABLE · FORCE + tenant_isolation. edim_platform 은 권한 0(읽기 거부).
-- **원가 계산은 이 표들을 읽지 않는다**(원가의 제조비는 지금처럼 mfg_rate(F10)만) — 시연 원가 ₩15,487,170 불변.
-- 추가만 되는 기록 표(stock_move · work_step_log · inspection · defect_log · work_order_step)는 edim_app 에 UPDATE · DELETE 권한이 없다.
-- 되돌리기: 아래 표를 역순으로 DROP · ALTER TABLE project DROP COLUMN qty, DROP COLUMN due_date · DROP FUNCTION stock_move_guard().

-- 1) 프로젝트 수량 · 납기(MRP 입력) — 기본 수량 1 · 납기 없음(옛 행 그대로)
ALTER TABLE "project" ADD COLUMN "qty" INTEGER NOT NULL DEFAULT 1 CHECK ("qty" BETWEEN 1 AND 9999);
ALTER TABLE "project" ADD COLUMN "due_date" DATE NULL;

-- 2) 기준정보(p43) — 작업장 · 기계 · 작업자 · 창고 · 품목 자재 정보 · 공정 순서
CREATE TABLE "work_center" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code"          TEXT NOT NULL CHECK ("code" ~ '^[A-Za-z0-9_-]{1,20}$'),
  "name"          TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 40),
  "hours_per_day" NUMERIC NOT NULL DEFAULT 8 CHECK ("hours_per_day" > 0 AND "hours_per_day" <= 24),
  "is_sample"     BOOLEAN NOT NULL DEFAULT false,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "work_center_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_center_tenant_code_key" UNIQUE ("tenant_id", "code")
);
CREATE TABLE "machine" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "work_center_id" UUID NOT NULL REFERENCES "work_center"("id") ON DELETE CASCADE,
  "code"           TEXT NOT NULL CHECK ("code" ~ '^[A-Za-z0-9_-]{1,20}$'),
  "kind"           TEXT NOT NULL CHECK (length("kind") BETWEEN 1 AND 40),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "machine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "machine_tenant_code_key" UNIQUE ("tenant_id", "code")
);
CREATE TABLE "worker" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code"         TEXT NOT NULL CHECK ("code" ~ '^[A-Za-z0-9_-]{1,20}$'),
  "display_name" TEXT NOT NULL CHECK (length("display_name") BETWEEN 1 AND 40),
  "skill_grade"  TEXT NOT NULL CHECK ("skill_grade" ~ '^[A-Z][0-9]$'),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "worker_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "worker_tenant_code_key" UNIQUE ("tenant_id", "code")
);
CREATE TABLE "warehouse" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code"       TEXT NOT NULL CHECK ("code" ~ '^[A-Za-z0-9_-]{1,20}$'),
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 40),
  "location"   TEXT NOT NULL DEFAULT '' CHECK (length("location") <= 80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "warehouse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouse_tenant_code_key" UNIQUE ("tenant_id", "code")
);
CREATE TABLE "item_material" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "item_code"    TEXT NOT NULL CHECK (length("item_code") BETWEEN 1 AND 40),
  "warehouse_id" UUID NOT NULL REFERENCES "warehouse"("id") ON DELETE RESTRICT,
  "min_stack"    NUMERIC NOT NULL DEFAULT 0 CHECK ("min_stack" >= 0),
  "supplier"     TEXT NULL CHECK ("supplier" IS NULL OR length("supplier") <= 80),
  "make_buy"     TEXT NOT NULL CHECK ("make_buy" IN ('make', 'buy')),
  "lead_days"    INTEGER NOT NULL DEFAULT 0 CHECK ("lead_days" BETWEEN 0 AND 365),
  "unit"         TEXT NOT NULL DEFAULT 'ea' CHECK (length("unit") BETWEEN 1 AND 10),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "item_material_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "item_material_tenant_item_key" UNIQUE ("tenant_id", "item_code")
);
CREATE TABLE "process_route" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "item_code"      TEXT NOT NULL CHECK (length("item_code") BETWEEN 1 AND 40),
  "seq"            INTEGER NOT NULL CHECK ("seq" BETWEEN 1 AND 99),
  "name"           TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 40),
  "work_center_id" UUID NOT NULL REFERENCES "work_center"("id") ON DELETE RESTRICT,
  "persons"        INTEGER NOT NULL DEFAULT 1 CHECK ("persons" BETWEEN 1 AND 50),
  "skill"          TEXT NOT NULL CHECK ("skill" ~ '^[A-Z][0-9]$'),
  "hours"          NUMERIC NOT NULL CHECK ("hours" > 0 AND "hours" <= 1000),
  "prev_seq"       INTEGER NULL CHECK ("prev_seq" IS NULL OR "prev_seq" < "seq"),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "process_route_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "process_route_tenant_item_seq_key" UNIQUE ("tenant_id", "item_code", "seq")
);

-- 3) 창고 · 재고(p44-4) — 입출고는 추가만 되는 기록. 현재고 = 기록 합. 음수 재고가 되는 이동은 DB 가 거부한다.
CREATE TABLE "stock_move" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "item_code"    TEXT NOT NULL CHECK (length("item_code") BETWEEN 1 AND 40),
  "warehouse_id" UUID NOT NULL REFERENCES "warehouse"("id") ON DELETE RESTRICT,
  "qty"          NUMERIC NOT NULL CHECK ("qty" <> 0),
  "unit_price"   NUMERIC NULL CHECK ("unit_price" IS NULL OR "unit_price" >= 0),
  "reason"       TEXT NOT NULL CHECK ("reason" IN ('receipt', 'issue', 'wo_consume', 'inspection_return')),
  "ref_kind"     TEXT NULL CHECK ("ref_kind" IS NULL OR "ref_kind" IN ('purchase_request', 'work_order', 'inspection')),
  "ref_id"       UUID NULL,
  "created_by"   UUID NOT NULL,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_move_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_move_sign" CHECK (("reason" = 'receipt') = ("qty" > 0)),
  CONSTRAINT "stock_move_price" CHECK ("reason" <> 'receipt' OR "unit_price" IS NOT NULL)
);
CREATE INDEX "stock_move_item_idx" ON "stock_move" ("tenant_id", "item_code", "warehouse_id");

-- 음수 재고 거부 — 같은 (회사 · 품목 · 창고)는 트랜잭션 잠금으로 줄을 세운다(동시 출고 경합에도 합이 음수가 되지 않는다).
-- 창고가 같은 회사인지도 여기서 본다(외래 키 검사는 RLS 를 보지 않는다).
CREATE OR REPLACE FUNCTION stock_move_guard() RETURNS trigger AS $$
DECLARE
  bal numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "warehouse" w WHERE w.id = NEW.warehouse_id AND w.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'warehouse % not found in this tenant', NEW.warehouse_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text || '|' || NEW.item_code || '|' || NEW.warehouse_id::text, 0));
  SELECT COALESCE(sum(qty), 0) INTO bal FROM "stock_move"
    WHERE tenant_id = NEW.tenant_id AND item_code = NEW.item_code AND warehouse_id = NEW.warehouse_id;
  IF bal + NEW.qty < 0 THEN
    RAISE EXCEPTION 'insufficient stock: % on hand %, move %', NEW.item_code, bal, NEW.qty USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER stock_move_guard_trg BEFORE INSERT ON "stock_move" FOR EACH ROW EXECUTE FUNCTION stock_move_guard();

-- 4) 작업지시 · 공정 진행(p44-2 · 3). 지시 순간의 공정 순서를 **복사**한다(나중에 route 를 고쳐도 지시서 불변).
CREATE TABLE "work_order" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "wo_no"       TEXT NOT NULL,
  "project_id"  UUID NOT NULL REFERENCES "project"("id") ON DELETE RESTRICT,
  "bom_run_id"  UUID NOT NULL REFERENCES "bom_code_run"("id") ON DELETE RESTRICT,
  "item_code"   TEXT NOT NULL CHECK (length("item_code") BETWEEN 1 AND 40),
  "qty"         NUMERIC NOT NULL CHECK ("qty" > 0),
  "due_date"    DATE NULL,
  "status"      TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'released', 'in_progress', 'done')),
  "created_by"  UUID NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "work_order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_tenant_no_key" UNIQUE ("tenant_id", "wo_no")
);
CREATE TABLE "work_order_step" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "work_order_id"  UUID NOT NULL REFERENCES "work_order"("id") ON DELETE CASCADE,
  "seq"            INTEGER NOT NULL,
  "name"           TEXT NOT NULL,
  "work_center_id" UUID NOT NULL REFERENCES "work_center"("id") ON DELETE RESTRICT,
  "persons"        INTEGER NOT NULL,
  "skill"          TEXT NOT NULL,
  "hours"          NUMERIC NOT NULL,
  "prev_seq"       INTEGER NULL,
  CONSTRAINT "work_order_step_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_step_wo_seq_key" UNIQUE ("work_order_id", "seq")
);
CREATE TABLE "work_step_log" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "work_order_id" UUID NOT NULL REFERENCES "work_order"("id") ON DELETE CASCADE,
  "step_seq"      INTEGER NOT NULL,
  "event"         TEXT NOT NULL CHECK ("event" IN ('start', 'finish')),
  "worker_id"     UUID NULL REFERENCES "worker"("id") ON DELETE RESTRICT,
  "actual_hours"  NUMERIC NULL CHECK ("actual_hours" IS NULL OR ("actual_hours" >= 0 AND "actual_hours" <= 1000)),
  "created_by"    UUID NOT NULL,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "work_step_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_step_log_once" UNIQUE ("work_order_id", "step_seq", "event")
);

-- 5) 품질(p44-5) — 검수는 추가만. 불합격 → 하자 건(열림 → 조치 → 닫힘). 상태 변경은 로그로 추가만. 하자 종류 'as' = 유지보수 A/S(p69-5).
CREATE TABLE "inspection" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "target"     TEXT NOT NULL CHECK ("target" IN ('material', 'product', 'install')),
  "ref_id"     UUID NOT NULL,
  "item_code"  TEXT NULL,
  "result"     TEXT NOT NULL CHECK ("result" IN ('pass', 'fail')),
  "memo"       TEXT NOT NULL DEFAULT '' CHECK (length("memo") <= 200),
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inspection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inspection_ref_idx" ON "inspection" ("tenant_id", "ref_id");
CREATE TABLE "defect" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "kind"          TEXT NOT NULL DEFAULT 'defect' CHECK ("kind" IN ('defect', 'as')),
  "inspection_id" UUID NULL REFERENCES "inspection"("id") ON DELETE RESTRICT,
  "ref_id"        UUID NULL,
  "title"         TEXT NOT NULL CHECK (length("title") BETWEEN 1 AND 120),
  "status"        TEXT NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'action', 'closed')),
  "created_by"    UUID NOT NULL,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "defect_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "defect_log" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "defect_id"  UUID NOT NULL REFERENCES "defect"("id") ON DELETE CASCADE,
  "status"     TEXT NOT NULL CHECK ("status" IN ('open', 'action', 'closed')),
  "note"       TEXT NOT NULL DEFAULT '' CHECK (length("note") <= 200),
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "defect_log_pkey" PRIMARY KEY ("id")
);

-- 6) RLS — 전부 회사 경계
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['work_center','machine','worker','warehouse','item_material','process_route','stock_move',
                           'work_order','work_order_step','work_step_log','inspection','defect','defect_log'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I
      USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)$p$, t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
  END LOOP;
END $$;

-- 7) 권한 — 0002 의 기본 권한(SELECT/INSERT/UPDATE/DELETE)을 표마다 좁힌다. edim_platform 에는 아무것도 주지 않는다.
GRANT SELECT, INSERT, UPDATE, DELETE ON "work_center", "machine", "worker", "warehouse", "item_material", "process_route" TO edim_app;
REVOKE ALL ON "stock_move", "work_order_step", "work_step_log", "inspection", "defect_log" FROM edim_app;
GRANT SELECT, INSERT ON "stock_move", "work_order_step", "work_step_log", "inspection", "defect_log" TO edim_app;
REVOKE ALL ON "work_order", "defect" FROM edim_app;
GRANT SELECT, INSERT ON "work_order", "defect" TO edim_app;
GRANT UPDATE ("status", "updated_at") ON "work_order" TO edim_app;
GRANT UPDATE ("status", "updated_at") ON "defect" TO edim_app;
