-- 0013 · 3D View 1차 (2026-09-23 · 회장님 승인 범위)
-- 근거: 코퍼스 EDIM_ARRANGEMENT_SETUP_DRAWING_VIEW_MODEL.md "3D View"(Exploded View · Assembly Sequence View)
--       · 청사진 p36 3D · p40 Assembling.
-- 0012 에서 3각법(front·right)을 열었고, 여기서 3D 계열 두 종을 연다.
--
--   iso      = 아이소메트릭 투영(등각) — 같은 스냅샷의 치수·구획·부품 배치를 30° 등각으로 그린다.
--   exploded = 분해도 — 구획을 길이 방향으로 띄우고 조립 순서 번호를 붙인다(p40 Assembling).
--
-- 아직 실제 3D 형상(glTF/WebGL)은 아니다. 지금 단계에서 정직한 이름은 "3D 투영 도면"이고,
-- 형상 모델러가 들어오면 같은 drawing_type 값 위에 내용만 깊어진다(값을 다시 바꾸지 않아도 된다).
--
-- 추가만 하는 마이그레이션(제약 완화). 되돌리기: CHECK 를 0012 의 네 값으로 되돌리고 iso·exploded 행을 지운다.
ALTER TABLE "drawing" DROP CONSTRAINT "drawing_type_check";
ALTER TABLE "drawing"
  ADD CONSTRAINT "drawing_type_check"
  CHECK ("drawing_type" IN ('plan','assembly','front','right','iso','exploded'));

COMMENT ON COLUMN "drawing"."drawing_type" IS
  '3각법: plan=Top(L×W) · front=Front(L×H) · right=Right(W×H) · assembly=조립도 / 3D 투영: iso=등각 · exploded=분해도';
