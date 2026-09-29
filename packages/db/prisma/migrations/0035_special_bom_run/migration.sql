-- 0035 · ccmd K · KA — CPQ 가 BOM Run 안에서 Special(팬 선정)을 부른다: 사용 기록이 **어느 BOM 스냅샷**에서 나왔는지.
-- 추가만: special_run 에 열 하나(NULL 허용 — 기존 행 = 손 실행) + 외래 키 + 부분 유일 인덱스(같은 스냅샷 두 번 과금 금지).
-- 권한은 그대로: edim_app 은 special_run 에 SELECT · INSERT 만(고치기 · 지우기 없음) · edim_platform 은 금액 칸 열 권한만(bom_run_id 도 못 읽는다).

ALTER TABLE "special_run" ADD COLUMN "bom_run_id" uuid NULL;
ALTER TABLE "special_run"
  ADD CONSTRAINT "special_run_bom_run_fkey" FOREIGN KEY ("bom_run_id") REFERENCES "bom_code_run" ("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "special_run_bom_run_key" ON "special_run" ("tenant_id", "bom_run_id") WHERE "bom_run_id" IS NOT NULL;
