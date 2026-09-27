-- 0031 · p58 [EDIM System Toolbar Module] 그림 제작 Module 1단계 — 도면 위 주석 레이어
-- 선 · 사각형 · 글자 · 치수선을 도면(drawing) 좌표(mm)에 더하고 옮기고 지운다. **원 도면(drawing.dxf · BOM 스냅샷)은 그대로** —
-- 주석은 이 테이블에 따로 있고, DXF 내보내기(?annot=1)에서만 ANNOT 레이어로 덧붙는다.
-- 발행된 도면의 주석은 앱이 잠근다(409). Free CAD · 설계 심볼은 계속 잠긴 자리(이유 표시).
-- 추가만 하는 마이그레이션(새 테이블). 되돌리기: DROP TABLE "drawing_annotation";
CREATE TABLE "drawing_annotation" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "drawing_id" UUID NOT NULL REFERENCES "drawing"("id") ON DELETE CASCADE,
  "kind"       TEXT NOT NULL CHECK ("kind" IN ('line','rect','text','dim')),
  "x1"         DOUBLE PRECISION NOT NULL,
  "y1"         DOUBLE PRECISION NOT NULL,
  "x2"         DOUBLE PRECISION NOT NULL,
  "y2"         DOUBLE PRECISION NOT NULL,
  "text"       TEXT CHECK ("text" IS NULL OR length("text") BETWEEN 1 AND 80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "drawing_annotation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drawing_annotation_text" CHECK ("kind" <> 'text' OR "text" IS NOT NULL)
);
CREATE INDEX "drawing_annotation_drawing_idx" ON "drawing_annotation" ("tenant_id","drawing_id");

ALTER TABLE "drawing_annotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drawing_annotation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "drawing_annotation"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "drawing_annotation" TO edim_app;
