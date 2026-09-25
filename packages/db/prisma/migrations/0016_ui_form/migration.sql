-- 0016 · 사용자 UI Form (청사진 p25 [EDIM Toolbox UI]) · UI Design 작업장 (p26 [Set-Up / EDIM UI Design] · S-2-1)
-- 회사가 위젯(Button · Combo box · Table · Label)을 캔버스에 배치하고 각 위젯의 Set-up
-- (데이터 원천 · 동작 · 대상 · Active Set-up)을 정한 폼을 저장한다. is_templet = "여러 동작을 정의한 Templet"
-- — 다른 폼이 호출해 복사한 뒤 고쳐 쓴다(Sample Templet 호출하여 Customizing).
-- spec 검증은 앱이 한다(apps/web/app/lib/ui-form.ts — 위젯 수·종류·격자 범위·참조 무결성).
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "ui_form".
CREATE TABLE "ui_form" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 60),
  "scope"      TEXT NOT NULL,
  "is_templet" BOOLEAN NOT NULL DEFAULT false,
  "spec"       JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_by" UUID NOT NULL,
  CONSTRAINT "ui_form_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ui_form_tenant_id_name_key" ON "ui_form" ("tenant_id", "name");

ALTER TABLE "ui_form" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ui_form" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ui_form"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
