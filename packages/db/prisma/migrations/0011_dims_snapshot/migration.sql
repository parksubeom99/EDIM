-- 0011 · 치수를 BOM 스냅샷에 함께 박는다 (2026-09-22 · 회장님 Tier B 승인)
-- 배경: 도면은 줄·코드를 스냅샷에서 읽었지만 치수(W·H·L)는 현재 등록 표에서 읽었다 → 승인된 BOM 으로
-- 승인된 적 없는 치수의 도면이 나갈 수 있었다(e2e S30f 가 잡음 · 09-21 은 지문 가드 409 로 임시 차단).
-- 이제 스냅샷을 뜰 때 치수를 함께 저장하고, 도면은 이 값만 읽는다. 옛 행(NULL)은 도면을 다시 그릴 수 없다(422).
ALTER TABLE bom_code_run ADD COLUMN dims JSONB;
COMMENT ON COLUMN bom_code_run.dims IS 'Key Dimension at run time {W,H,L,item,tableName}. NULL = 0011 이전 스냅샷 — 도면 재생성 불가';
