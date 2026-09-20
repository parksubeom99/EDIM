-- P4-a: 도면을 산출물로 남긴다 + BOM 스냅샷이 "어느 Rev로 돌렸는지"를 기록한다.
-- 근거: EDIM.pdf p24 "2. Drawings" 컬럼(도면번호·유형·축척·크기·current_rev·status)
--       · p38·p40(조립도 = 외형 + Item 표) · 연결 장부 '약함' 3건.
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE drawing + 컬럼 1개 드롭.

-- 1) 스냅샷에 코드 개정을 박는다 --------------------------------------------
-- 지금까지는 "어느 Rev 로 BOM 을 돌렸는지"가 어디에도 없었다(연결 장부 약함 #3).
ALTER TABLE "bom_code_run" ADD COLUMN "code_revision_id" uuid;
ALTER TABLE "bom_code_run"
  ADD CONSTRAINT "bom_code_run_code_revision_id_fkey"
  FOREIGN KEY ("code_revision_id") REFERENCES "code_revision" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) 도면 -------------------------------------------------------------------
-- 모든 도면은 **BOM 스냅샷 하나**에서 나온다(bom_run_id NOT NULL). 스냅샷 없이
-- 만들어진 도면은 근거를 추적할 수 없으므로 애초에 만들어지지 않는다.
CREATE TABLE "drawing" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL,
  "hierarchy_stable" uuid,
  "bom_run_id"       uuid NOT NULL,
  "drawing_no"       text NOT NULL,
  "drawing_type"     text NOT NULL,
  "scale"            text NOT NULL DEFAULT '1:50',
  "size"             text NOT NULL DEFAULT 'A3',
  "current_rev"      text NOT NULL DEFAULT 'A',
  "status"           text NOT NULL DEFAULT 'draft',
  "code"             text NOT NULL,
  "dxf"              text NOT NULL,
  "meta"             jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"       uuid NOT NULL,
  CONSTRAINT "drawing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drawing_type_check" CHECK ("drawing_type" IN ('plan','assembly')),
  -- p24 status: 작성중 / 검토 / 승인 / 발행
  CONSTRAINT "drawing_status_check" CHECK ("status" IN ('draft','review','approved','issued')),
  CONSTRAINT "drawing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "drawing_bom_run_id_fkey" FOREIGN KEY ("bom_run_id") REFERENCES "bom_code_run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "drawing_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "drawing_tenant_no_rev_key" ON "drawing" ("tenant_id", "drawing_no", "current_rev");
CREATE INDEX "drawing_tenant_node_idx" ON "drawing" ("tenant_id", "hierarchy_stable", "created_at" DESC);

ALTER TABLE "drawing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drawing" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "drawing"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 3) 발행 잠금은 DB 가 건다 --------------------------------------------------
-- 앱이 깜빡해도 발행된 도면은 바뀌지 않는다. 상태를 되돌리는 것도 막는다
-- (draft→review→approved→issued 단방향).
CREATE OR REPLACE FUNCTION drawing_guard() RETURNS trigger AS $$
DECLARE
  ord_old int;
  ord_new int;
BEGIN
  IF OLD.status = 'issued' THEN
    RAISE EXCEPTION 'drawing % is issued and cannot be modified', OLD.drawing_no
      USING ERRCODE = 'check_violation';
  END IF;
  ord_old := array_position(ARRAY['draft','review','approved','issued'], OLD.status);
  ord_new := array_position(ARRAY['draft','review','approved','issued'], NEW.status);
  IF ord_new < ord_old THEN
    RAISE EXCEPTION 'drawing status cannot go backwards (% -> %)', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drawing_guard_trg BEFORE UPDATE ON "drawing"
  FOR EACH ROW EXECUTE FUNCTION drawing_guard();

-- 발행된 도면은 삭제도 막는다.
CREATE OR REPLACE FUNCTION drawing_delete_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'issued' THEN
    RAISE EXCEPTION 'drawing % is issued and cannot be deleted', OLD.drawing_no
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drawing_delete_guard_trg BEFORE DELETE ON "drawing"
  FOR EACH ROW EXECUTE FUNCTION drawing_delete_guard();

-- 4) 권한: 도면은 회사 데이터(DB②)다. 플랫폼 역할에는 주지 않는다.
--    (edim_app 은 0002 의 ALTER DEFAULT PRIVILEGES 로 자동 부여됨)
