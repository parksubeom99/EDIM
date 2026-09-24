-- 0014 · 프로젝트 관리 화면 (청사진 p12 [ERP / Sale / Project Management] · p50 같은 화면의 User ERP 판)
-- p12 헤더에 있는데 테이블에 없던 것: 담당자(▼ 사람 선택) · Remarks · Description.
-- 접수 자료 등록(File): 지금까지 file_ref 는 '(pending)' 이었다(메타데이터만) → 실제 파일을 받고
--   종류·크기를 적는다. 파일 본체는 DB 가 아니라 서버 저장소(EDIM_STORAGE_DIR)에 두고 file_ref 가 가리킨다.
--
-- 추가만 하는 마이그레이션(전부 NULL 허용). 되돌리기: 아래 다섯 열을 DROP.
ALTER TABLE "project" ADD COLUMN "owner_id" UUID REFERENCES "app_user"("id");
ALTER TABLE "project" ADD COLUMN "remarks" TEXT;
ALTER TABLE "project" ADD COLUMN "description" TEXT;
ALTER TABLE "project_attachment" ADD COLUMN "file_mime" TEXT;
ALTER TABLE "project_attachment" ADD COLUMN "file_size" INTEGER;

COMMENT ON COLUMN "project"."owner_id" IS 'p12 담당자 — 같은 테넌트 구성원(membership)만 API 가 받는다';
COMMENT ON COLUMN "project_attachment"."file_ref" IS 'local:<tenant>/<uuid> = 실제 파일(0014) · 그 외 = 메타데이터만(예전 행)';
