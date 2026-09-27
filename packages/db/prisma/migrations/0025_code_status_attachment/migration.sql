-- 0025 · p32 · p30 자재·구매 코드별 Approval Status · 도면(DWG 2D/3D) 첨부 — 첨부는 p35(Arrangement Drawing Control) · p18(Data Up-Load)도 같이 쓴다
-- 1) product_code.approval_status — NULL = 미지정(이 열 이전 코드) · draft(작성중) → approved(승인) → retired(사용중지). 역행 금지(트리거).
-- 2) attachment — 코드·Arrangement Code·작업대 노드에 붙는 파일(메타데이터). 파일 본체는 0014 접수 자료와 같은 저장소(putFile)를 쓴다.
-- 추가만 하는 마이그레이션(NULL 허용 새 열 · 새 테이블 · 새 트리거). 되돌리기:
--   DROP TRIGGER product_code_status_guard_trg ON "product_code"; DROP FUNCTION product_code_status_guard();
--   ALTER TABLE "product_code" DROP COLUMN "approval_status"; DROP TABLE "attachment";
ALTER TABLE "product_code" ADD COLUMN "approval_status" TEXT;
ALTER TABLE "product_code" ADD CONSTRAINT "product_code_approval_status_check"
  CHECK ("approval_status" IS NULL OR "approval_status" IN ('draft','approved','retired'));

CREATE OR REPLACE FUNCTION product_code_status_guard() RETURNS trigger AS $$
DECLARE
  o int; n int;
BEGIN
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN RETURN NEW; END IF;
  IF NEW.approval_status IS NULL THEN
    RAISE EXCEPTION 'code % approval status cannot be cleared', OLD.code USING ERRCODE = 'check_violation';
  END IF;
  o := coalesce(array_position(ARRAY['draft','approved','retired'], OLD.approval_status), 0);
  n := array_position(ARRAY['draft','approved','retired'], NEW.approval_status);
  IF n < o THEN
    RAISE EXCEPTION 'code % approval status cannot go backwards (% -> %)', OLD.code, OLD.approval_status, NEW.approval_status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER product_code_status_guard_trg BEFORE UPDATE OF "approval_status" ON "product_code"
  FOR EACH ROW EXECUTE FUNCTION product_code_status_guard();

CREATE TABLE "attachment" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "owner_kind"  TEXT NOT NULL CHECK ("owner_kind" IN ('product_code','arrangement_code','node')),
  "owner_key"   TEXT NOT NULL CHECK (length("owner_key") BETWEEN 1 AND 80),
  "kind"        TEXT NOT NULL CHECK ("kind" IN ('dwg2d','dwg3d','data')),
  "name"        TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 120),
  "description" TEXT,
  "file_ref"    TEXT NOT NULL,
  "file_mime"   TEXT,
  "file_size"   INTEGER,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "uploaded_by" UUID NOT NULL,
  CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "attachment_owner_idx" ON "attachment" ("tenant_id","owner_kind","owner_key");

ALTER TABLE "attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attachment"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON "attachment" TO edim_app;
REVOKE UPDATE ON "attachment" FROM edim_app;  -- 첨부는 바꾸지 않는다: 새 파일은 새 행
