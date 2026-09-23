-- 0012 · 2D 3각법 (2026-09-23 · 회장님 Tier B 승인)
-- 근거: 코퍼스 EDIM_ARRANGEMENT_SETUP_DRAWING_VIEW_MODEL.md "2D 3각법 View"(Front/Top/Right)
--       · 청사진 p36 DWG View · p39 도면 구성 설정.
-- 지금까지 도면은 평면(plan = Top View)과 조립도 둘뿐이라 drawing_type CHECK 가 그 둘로 잠겨 있었다.
-- 정면(front)·우측면(right)을 같은 BOM 스냅샷에서 뽑으려면 이 제약을 넓혀야 한다.
--
-- 값의 뜻 (3각법 · 같은 Parameter Set 공유 — 코퍼스 "2D와 3D의 관계"):
--   plan     = Top View   (L × W) — 기존 이름을 그대로 둔다(옛 행 보존)
--   front    = Front View (L × H)
--   right    = Right View (W × H)
--   assembly = 조립도(풍선번호 + Item 표, p38·p40)
--
-- 추가만 하는 마이그레이션(제약 완화). 되돌리기: 아래 CHECK 를 옛 두 값으로 되돌리고
-- front·right 행을 지우면 된다(옛 행은 영향 없음).
ALTER TABLE "drawing" DROP CONSTRAINT "drawing_type_check";
ALTER TABLE "drawing"
  ADD CONSTRAINT "drawing_type_check" CHECK ("drawing_type" IN ('plan','assembly','front','right'));

COMMENT ON COLUMN "drawing"."drawing_type" IS '3각법: plan=Top(L×W) · front=Front(L×H) · right=Right(W×H) · assembly=조립도';
