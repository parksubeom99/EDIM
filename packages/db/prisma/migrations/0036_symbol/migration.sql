-- 0036 · ccmd K · KC-3 — p58 설계 심볼 라이브러리: 심볼 모양(design_symbol) + 도면 위 배치(drawing_symbol).
-- 추가만(새 테이블 둘 · 트리거 함수 하나). 둘 다 회사 업무 표(DB②) — tenant_id + RLS ENABLE · FORCE + tenant_isolation.
-- 원 도면(drawing.dxf · BOM 스냅샷)은 그대로 — 배치는 이 표에 따로 있고 DXF 내보내기(?annot=1)에서만 SYMBOL 레이어로 덧붙는다.
-- 발행된 도면의 배치는 **DB 가** 잠근다(삽입 · 수정 · 삭제 거부) — 앱이 깜빡해도 발행 도면은 바뀌지 않는다(0008 과 같은 원칙).
-- 되돌리기: DROP TABLE "drawing_symbol"; DROP TABLE "design_symbol"; DROP FUNCTION drawing_symbol_guard();

CREATE TABLE "design_symbol" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "key"        TEXT NOT NULL CHECK ("key" ~ '^[a-z][a-z0-9_-]{0,31}$'),
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 40),
  "primitives" JSONB NOT NULL CHECK (jsonb_typeof("primitives") = 'array'),
  "is_sample"  BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "design_symbol_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "design_symbol_tenant_key_key" UNIQUE ("tenant_id", "key")
);

CREATE TABLE "drawing_symbol" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "drawing_id" UUID NOT NULL REFERENCES "drawing"("id") ON DELETE CASCADE,
  "symbol_id"  UUID NOT NULL REFERENCES "design_symbol"("id") ON DELETE RESTRICT,
  "x"          DOUBLE PRECISION NOT NULL,
  "y"          DOUBLE PRECISION NOT NULL,
  "rot"        INTEGER NOT NULL DEFAULT 0 CHECK ("rot" IN (0, 90, 180, 270)),
  "scale"      DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK ("scale" > 0 AND "scale" <= 20),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "drawing_symbol_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "drawing_symbol_drawing_idx" ON "drawing_symbol" ("tenant_id", "drawing_id");

-- 발행 잠금(삽입 · 수정 · 삭제). 도면이 이미 지워진 뒤의 연쇄 삭제(부모 행 없음)는 막지 않는다.
-- 회사 경계: 외래 키 검사는 RLS 를 보지 않는다 → 다른 회사 도면 · 심볼 id 를 가리키는 행은 여기서 막는다(같은 tenant 여야 한다).
CREATE OR REPLACE FUNCTION drawing_symbol_guard() RETURNS trigger AS $$
DECLARE
  st text;
  dt uuid;
  did uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN did := OLD.drawing_id; ELSE did := NEW.drawing_id; END IF;
  IF TG_OP = 'UPDATE' AND NEW.drawing_id <> OLD.drawing_id THEN
    RAISE EXCEPTION 'drawing_symbol cannot move to another drawing' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT status, tenant_id INTO st, dt FROM "drawing" WHERE id = did;
    IF NOT FOUND OR dt <> NEW.tenant_id THEN
      RAISE EXCEPTION 'drawing % not found in this tenant', did USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "design_symbol" s WHERE s.id = NEW.symbol_id AND s.tenant_id = NEW.tenant_id) THEN
      RAISE EXCEPTION 'design_symbol % not found in this tenant', NEW.symbol_id USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSE
    SELECT status INTO st FROM "drawing" WHERE id = did;
  END IF;
  IF st = 'issued' THEN
    RAISE EXCEPTION 'drawing % is issued — its symbols are locked', did USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drawing_symbol_guard_trg BEFORE INSERT OR UPDATE OR DELETE ON "drawing_symbol"
  FOR EACH ROW EXECUTE FUNCTION drawing_symbol_guard();

ALTER TABLE "design_symbol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "design_symbol" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "design_symbol"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "drawing_symbol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drawing_symbol" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "drawing_symbol"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 권한: 0002 의 기본 권한이 edim_app 에 SELECT/INSERT/UPDATE/DELETE 를 줬다 → 심볼 라이브러리는 읽기만으로 좁힌다(샘플 심볼은 시드가 넣는다).
REVOKE ALL ON "design_symbol" FROM edim_app;
GRANT SELECT ON "design_symbol" TO edim_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "drawing_symbol" TO edim_app;
