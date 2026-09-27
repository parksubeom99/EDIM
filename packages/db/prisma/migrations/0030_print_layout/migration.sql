-- 0030 · p48 [Set-Up / CPQ / Document / Print] 인쇄 양식 편집기 — "기본 양식 배치 · Data 호출 · 그래프 불러오기 · Data 위치 설정"
-- 1) print_layout — 문서 종류마다 양식 안 요소(제목 · 필드 · 표 · 도면 · 그래프 · 서명칸 · 로고 · 글상자)의 위치·크기(쪽 대비 %).
--    저장할 때마다 **새 버전**(version 1, 2, …) — 고치지도 지우지도 않는다(앱 역할 UPDATE · DELETE REVOKE).
-- 2) document.print_layout_id — 문서가 **발행되는 순간** 그때의 최신 양식 버전을 박는다(트리거 · NULL 허용 새 열).
--    발행된 문서의 인쇄본은 박힌 버전을 따른다 → 양식을 나중에 고쳐도 옛 발행본은 그대로. 발행 전 문서는 최신 양식을 따른다.
-- 요소 모양 검사는 앱 한 곳(app/lib/print-layout.ts). 숫자·내용은 그대로 문서 body(스냅샷) — 양식은 배치만 바꾼다.
-- 추가만 하는 마이그레이션(새 테이블 · NULL 허용 새 열 · 새 트리거). 되돌리기:
--   DROP TRIGGER document_pin_print_layout_trg ON "document"; DROP FUNCTION document_pin_print_layout();
--   ALTER TABLE "document" DROP COLUMN "print_layout_id"; DROP TABLE "print_layout";
CREATE TABLE "print_layout" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "doc_type"   TEXT NOT NULL CHECK ("doc_type" IN ('quotation','techdata')),
  "version"    INTEGER NOT NULL CHECK ("version" >= 1),
  "elements"   JSONB NOT NULL CHECK (jsonb_typeof("elements") = 'array' AND jsonb_array_length("elements") BETWEEN 1 AND 30),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "print_layout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "print_layout_tenant_id_doc_type_version_key" ON "print_layout" ("tenant_id","doc_type","version");

ALTER TABLE "print_layout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "print_layout" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "print_layout"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT ON "print_layout" TO edim_app;
REVOKE UPDATE, DELETE ON "print_layout" FROM edim_app;  -- 버전은 쌓기만

ALTER TABLE "document" ADD COLUMN "print_layout_id" UUID REFERENCES "print_layout"("id");

CREATE OR REPLACE FUNCTION document_pin_print_layout() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'issued' AND OLD.status IS DISTINCT FROM 'issued' AND NEW.print_layout_id IS NULL THEN
    SELECT id INTO NEW.print_layout_id FROM "print_layout"
      WHERE tenant_id = NEW.tenant_id AND doc_type = NEW.doc_type
      ORDER BY version DESC LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER document_pin_print_layout_trg BEFORE UPDATE OF "status" ON "document"
  FOR EACH ROW EXECUTE FUNCTION document_pin_print_layout();
