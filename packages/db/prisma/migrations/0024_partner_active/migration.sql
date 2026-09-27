-- 0024 · p64 Company DB — 고객·공급처 "사용 중지"
-- 프로젝트 · 단가 이력 · 구매 요청이 가리키는 고객·공급처는 지울 수 없다(409). 대신 사용 중지하면 새로 고르는 목록에서 빠진다.
-- 이미 가리키는 행은 그대로 보인다(옛 데이터 보존). 추가만 하는 마이그레이션(기본값 있는 새 열).
-- 되돌리기: ALTER TABLE "partner" DROP COLUMN "active";
ALTER TABLE "partner" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
