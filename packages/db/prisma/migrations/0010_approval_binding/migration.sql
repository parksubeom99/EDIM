-- P6: 프로젝트 승인을 BOM 스냅샷에 묶는다.
-- 근거: docs/plan/connection-ledger.md "프로젝트 승인 파이프라인 ↔ 코드 Rev·BOM: 없음 — 승인은 프로젝트 단위 메모일 뿐"
--       · EDIM.pdf p55(Approval Management) · p56(Design > Check > Approve > Accepted) · p65(ERP … Approval)
--       · 회장님 지시 2026-09-21 "엘이 이어서 할 수 있는 것부터 전부".
-- 지금까지 승인 요청은 메모에 `code=문자열`을 적었을 뿐이라 **무엇을 승인했는지 시스템이 몰랐다.**
-- 스냅샷은 이미 코드 개정·매크로 개정·카탈로그 지문을 품고 있다 → 승인을 스냅샷에 묶으면 셋이 한 번에 묶인다.
-- 추가만 하는 마이그레이션. 되돌리기: 트리거 4개·함수 3개 드롭 + project_approval.bom_run_id 드롭.

ALTER TABLE "project_approval" ADD COLUMN "bom_run_id" uuid;
ALTER TABLE "project_approval" ADD CONSTRAINT "project_approval_bom_run_id_fkey"
  FOREIGN KEY ("bom_run_id") REFERENCES "bom_code_run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "project_approval_run_idx" ON "project_approval" ("tenant_id", "bom_run_id");

-- 1) 승인 기록 자체를 지킨다: 묶인 스냅샷은 바꿀 수 없고, 한 번 결정된 승인은 다시 못 고친다.
CREATE OR REPLACE FUNCTION project_approval_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.bom_run_id IS DISTINCT FROM NEW.bom_run_id THEN
    RAISE EXCEPTION 'approval binding cannot change (the approved BOM snapshot is fixed)'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.state <> 'requested' THEN
    RAISE EXCEPTION 'approval is already decided (%) and cannot be modified', OLD.state
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_approval_guard_trg BEFORE UPDATE ON "project_approval"
  FOR EACH ROW EXECUTE FUNCTION project_approval_guard();

-- 2) "이 BOM 은 승인됐는가" — 조직 승인(tier:org)이 approved 인 기록이 그 스냅샷에 묶여 있는가.
--    (RLS 가 걸린 채로 호출 역할의 권한으로 돈다 → 다른 테넌트의 승인은 보이지 않는다)
CREATE OR REPLACE FUNCTION bom_run_is_approved(run uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "project_approval"
     WHERE bom_run_id = run AND state = 'approved' AND note LIKE 'tier:org%'
  );
$$ LANGUAGE sql STABLE;

-- 3) 밖으로 나가는 것은 승인된 BOM 에서만: 도면·문서의 발행(issued), 구매 요청의 발주(ordered).
CREATE OR REPLACE FUNCTION release_gate() RETURNS trigger AS $$
BEGIN
  IF NEW.status = TG_ARGV[0] AND OLD.status <> TG_ARGV[0] AND NOT bom_run_is_approved(NEW.bom_run_id) THEN
    RAISE EXCEPTION 'BOM snapshot % is not approved — % cannot be %', NEW.bom_run_id, TG_TABLE_NAME, TG_ARGV[0]
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drawing_release_gate_trg BEFORE UPDATE ON "drawing"
  FOR EACH ROW EXECUTE FUNCTION release_gate('issued');
CREATE TRIGGER document_release_gate_trg BEFORE UPDATE ON "document"
  FOR EACH ROW EXECUTE FUNCTION release_gate('issued');
CREATE TRIGGER purchase_request_release_gate_trg BEFORE UPDATE ON "purchase_request"
  FOR EACH ROW EXECUTE FUNCTION release_gate('ordered');
