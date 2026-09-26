-- 0020 · 도면 용도 구분 (청사진 p17 · p39 "용도별(Approval / Manufacturing)" · 코퍼스 DECISION_2026_05_08 "도면 용도별로 처리 방식을 다르게 한다")
-- 도면에 용도를 단다: approval(승인도) · manufacturing(제작도) · quotation(견적도). 옛 도면은 NULL(미지정) 그대로.
-- 발행된 도면은 0008 의 drawing_guard 트리거가 모든 UPDATE 를 막으므로 **발행 후 용도 변경도 불가**다(트리거는 건드리지 않는다).
-- 추가만 하는 마이그레이션(NULL 허용 새 열). 되돌리기: ALTER TABLE "drawing" DROP COLUMN "purpose";
ALTER TABLE "drawing" ADD COLUMN "purpose" TEXT;
ALTER TABLE "drawing" ADD CONSTRAINT "drawing_purpose_check"
  CHECK ("purpose" IS NULL OR "purpose" IN ('approval','manufacturing','quotation'));
