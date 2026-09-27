-- 0023 · p12 · p50 Project Management — Client 담당자 여러 명 · 영업 활동 이력
-- project_contact : 프로젝트의 고객 쪽 담당자(이름 · 부서 · 연락처). 주담당은 프로젝트당 최대 1명(부분 unique).
-- project_activity: 영업 활동 이력(날짜 · 종류 · 내용). **쌓기만** — 앱 역할에 UPDATE/DELETE 권한이 없다(0005 코드 개정과 같은 방식).
-- 기존 project.client_contact(글자 한 칸)는 그대로 둔다(옛 데이터 보존).
-- 추가만 하는 마이그레이션. 되돌리기: DROP TABLE "project_activity"; DROP TABLE "project_contact";
CREATE TABLE "project_contact" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "project_id" UUID NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 60),
  "department" TEXT NOT NULL DEFAULT '',
  "contact"    TEXT NOT NULL DEFAULT '',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "project_contact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_contact_project_idx" ON "project_contact" ("tenant_id","project_id");
CREATE UNIQUE INDEX "project_contact_one_primary" ON "project_contact" ("project_id") WHERE "is_primary";

CREATE TABLE "project_activity" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "project_id"    UUID NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "activity_date" DATE NOT NULL,
  "kind"          TEXT NOT NULL CHECK ("kind" IN ('visit','call','mail','meeting','etc')),
  "content"       TEXT NOT NULL CHECK (length("content") BETWEEN 1 AND 2000),
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by"    UUID NOT NULL,
  CONSTRAINT "project_activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_activity_project_idx" ON "project_activity" ("tenant_id","project_id","activity_date");

ALTER TABLE "project_contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_contact" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "project_contact"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER TABLE "project_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_activity" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "project_activity"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "project_contact" TO edim_app;
GRANT SELECT, INSERT ON "project_activity" TO edim_app;
REVOKE UPDATE, DELETE ON "project_activity" FROM edim_app;  -- 영업 활동 이력: append-only by construction
