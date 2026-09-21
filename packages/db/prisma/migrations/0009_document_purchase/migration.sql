-- P4-b: 견적(PCR/Quotation) · Tech Data · 구매 요청을 산출물로 남긴다.
-- 근거: EDIM.pdf p66(PCR Table → Quotation · 견적번호·Revision) · p15~16(Tech Data · Input/Output Data)
--       · p51~52(Purchase request No · BOM No. · Process 견적 요청/발주 · PO No · BOM List 열)
--       · docs/01-design/P4-output-breadth-design.md §3 6~9 (회장님 승인 2026-09-19).
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE purchase_request_line, purchase_request, document
--   + bom_code_run 컬럼 3개 드롭 + 함수 2개 드롭.

-- 1) 스냅샷에 "어느 승인 매크로 몇 번째 개정으로 돌렸는지"를 박는다 -------------
-- Tech Data 는 결과값만이 아니라 그 값을 낸 매크로와 입력을 함께 보여야 한다(p16).
-- 지금까지 스냅샷에는 값(macro_value)만 있었다 — 나중에 매크로가 개정되면 근거를 잃는다.
ALTER TABLE "bom_code_run" ADD COLUMN "macro_id" uuid;
ALTER TABLE "bom_code_run" ADD COLUMN "macro_revision" integer;
ALTER TABLE "bom_code_run" ADD COLUMN "macro_dsl" text;

-- 2) 문서 -------------------------------------------------------------------
-- 도면과 같은 규칙: **BOM 스냅샷 하나**에서 나오고(bom_run_id NOT NULL), 번호·개정·
-- 상태 4단계를 갖고, 발행되면 잠긴다. body 는 만든 순간의 내용을 그대로 얼린 것이다
-- — 인쇄본은 body 만 읽는다(다시 계산하지 않는다).
CREATE TABLE "document" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL,
  "hierarchy_stable" uuid,
  "bom_run_id"       uuid NOT NULL,
  "doc_no"           text NOT NULL,
  "doc_type"         text NOT NULL,
  "current_rev"      text NOT NULL DEFAULT 'A',
  "status"           text NOT NULL DEFAULT 'draft',
  "code"             text NOT NULL,
  "body"             jsonb NOT NULL,
  "created_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"       uuid NOT NULL,
  CONSTRAINT "document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_type_check" CHECK ("doc_type" IN ('quotation','techdata')),
  CONSTRAINT "document_status_check" CHECK ("status" IN ('draft','review','approved','issued')),
  CONSTRAINT "document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_bom_run_id_fkey" FOREIGN KEY ("bom_run_id") REFERENCES "bom_code_run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "document_tenant_no_rev_key" ON "document" ("tenant_id", "doc_no", "current_rev");
CREATE INDEX "document_tenant_node_idx" ON "document" ("tenant_id", "hierarchy_stable", "created_at" DESC);

ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "document"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 발행 잠금 · 상태 역행 금지 — 0008 의 drawing_guard 와 **같은 규칙**이다.
-- 그 함수는 본문에 drawing_no 열 이름이 박혀 있어 다른 테이블에 그대로 붙일 수 없다.
-- 그래서 같은 규칙을 열 이름에 묶이지 않는 모양으로 한 번 더 둔다(TG_ARGV[0] = 번호 열).
-- drawing 의 트리거는 건드리지 않는다(P4-a 검증 12/12 를 그대로 둔다).
CREATE OR REPLACE FUNCTION issued_lock_guard() RETURNS trigger AS $$
DECLARE
  ord_old int;
  ord_new int;
  no_txt text := to_jsonb(OLD) ->> TG_ARGV[0];
BEGIN
  IF OLD.status = 'issued' THEN
    RAISE EXCEPTION '% % is issued and cannot be modified', TG_TABLE_NAME, no_txt
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  ord_old := array_position(ARRAY['draft','review','approved','issued'], OLD.status);
  ord_new := array_position(ARRAY['draft','review','approved','issued'], NEW.status);
  IF ord_new < ord_old THEN
    RAISE EXCEPTION '% status cannot go backwards (% -> %)', TG_TABLE_NAME, OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_guard_trg BEFORE UPDATE OR DELETE ON "document"
  FOR EACH ROW EXECUTE FUNCTION issued_lock_guard('doc_no');

-- 3) 구매 요청 (p51) ----------------------------------------------------------
-- 머리: PR 번호 · BOM No.(= 스냅샷) · Project No. · Process(작성 → 견적 요청 → 발주) · PO No.
-- 한 스냅샷에는 구매 요청이 하나다 — 같은 BOM 으로 두 번 사는 일을 DB 가 막는다.
CREATE TABLE "purchase_request" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL,
  "hierarchy_stable" uuid,
  "bom_run_id"       uuid NOT NULL,
  "pr_no"            text NOT NULL,
  "po_no"            text,
  "project_no"       text,
  "code"             text NOT NULL,
  "status"           text NOT NULL DEFAULT 'draft',
  "required_date"    date,
  "remarks"          text,
  "created_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"       uuid NOT NULL,
  CONSTRAINT "purchase_request_pkey" PRIMARY KEY ("id"),
  -- p51 Process: 견적 요청 / 발주. 'draft' = 아직 Process 를 고르지 않은 작성 상태.
  CONSTRAINT "purchase_request_status_check" CHECK ("status" IN ('draft','rfq','ordered')),
  CONSTRAINT "purchase_request_po_check" CHECK (("status" = 'ordered') = ("po_no" IS NOT NULL)),
  CONSTRAINT "purchase_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_request_bom_run_id_fkey" FOREIGN KEY ("bom_run_id") REFERENCES "bom_code_run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_request_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "purchase_request_tenant_no_key" ON "purchase_request" ("tenant_id", "pr_no");
CREATE UNIQUE INDEX "purchase_request_tenant_run_key" ON "purchase_request" ("tenant_id", "bom_run_id");
CREATE INDEX "purchase_request_tenant_node_idx" ON "purchase_request" ("tenant_id", "hierarchy_stable", "created_at" DESC);

-- 줄: p51 BOM List 열(Item · Code · Supplier · Required date · Price). 값은 스냅샷 줄에서 복사한다.
CREATE TABLE "purchase_request_line" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid NOT NULL,
  "pr_id"         uuid NOT NULL,
  "line_no"       integer NOT NULL,
  "bom_line_no"   integer NOT NULL,
  "child_code"    text NOT NULL,
  "resolved_code" text NOT NULL,
  "part"          text NOT NULL,
  "spec"          text NOT NULL,
  "qty"           double precision NOT NULL,
  "unit"          text NOT NULL,
  "unit_price"    integer NOT NULL,
  "supplier"      text,
  "required_date" date,
  CONSTRAINT "purchase_request_line_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_request_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_request_line_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "purchase_request_line_pr_no_key" ON "purchase_request_line" ("pr_id", "line_no");

ALTER TABLE "purchase_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_request" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_request"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER TABLE "purchase_request_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_request_line" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_request_line"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 발주된 구매 요청은 잠긴다(머리·줄 모두). Process 는 한 방향이다.
CREATE OR REPLACE FUNCTION purchase_request_guard() RETURNS trigger AS $$
DECLARE
  ord_old int;
  ord_new int;
BEGIN
  IF OLD.status = 'ordered' THEN
    RAISE EXCEPTION 'purchase request % is ordered and cannot be modified', OLD.pr_no
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  ord_old := array_position(ARRAY['draft','rfq','ordered'], OLD.status);
  ord_new := array_position(ARRAY['draft','rfq','ordered'], NEW.status);
  IF ord_new < ord_old THEN
    RAISE EXCEPTION 'purchase request process cannot go backwards (% -> %)', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_request_guard_trg BEFORE UPDATE OR DELETE ON "purchase_request"
  FOR EACH ROW EXECUTE FUNCTION purchase_request_guard();

CREATE OR REPLACE FUNCTION purchase_request_line_guard() RETURNS trigger AS $$
DECLARE
  st text;
BEGIN
  SELECT status INTO st FROM "purchase_request" WHERE id = OLD.pr_id;
  IF st = 'ordered' THEN
    RAISE EXCEPTION 'purchase request is ordered; its lines cannot be modified'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_request_line_guard_trg BEFORE UPDATE OR DELETE ON "purchase_request_line"
  FOR EACH ROW EXECUTE FUNCTION purchase_request_line_guard();

-- 4) 권한: 전부 회사 데이터(DB②)다. 플랫폼 역할에는 주지 않는다.
--    (edim_app 은 0002 의 ALTER DEFAULT PRIVILEGES 로 자동 부여됨)
