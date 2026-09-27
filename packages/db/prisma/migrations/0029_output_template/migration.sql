-- 0029 · p16 · p47 Document Template — Output Data 템플릿 · 그래프 전용 data · Table Type(Variant · Tech · Material)
-- 1) output_item — Tech Data 의 출력 항목: 이름 · 단위 · 출처. 출처는 두 가지뿐:
--      macro    = 그 BOM 스냅샷을 낸 **승인 매크로의 결과값**(없으면 Tech Data 자체가 422)
--      snapshot = 스냅샷에 박힌 값(원가 · 치수 · 줄 수) — 경로는 앱 한 곳(app/lib/output-template.ts)이 정한다
--    청사진의 "밀도 kg/m³" 같은 계산은 **승인 매크로가 그 값을 낼 때만** 나온다 — 여기서 식을 만들지 않는다.
-- 2) graph_def — 그래프 전용 data 표(회사가 넣는 점들)와 그래프 모양(막대/선) · 선택: Output 항목 값을 표시선으로.
-- 3) table_meta — 제품 코드의 등록 표마다 Table List 칸: 부서 · Table Type(variant|tech|material) · 설명 · 변형 원본(variant_of).
-- Tech Data 를 만들 때 Output 값과 그래프(점·표시선 값)를 문서 body 에 **스냅샷**으로 넣는다 — 템플릿을 고쳐도 옛 문서는 그대로.
-- 추가만 하는 마이그레이션(새 테이블 셋). 되돌리기: DROP TABLE "output_item"; DROP TABLE "graph_def"; DROP TABLE "table_meta";
CREATE TABLE "output_item" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "doc_type"   TEXT NOT NULL DEFAULT 'techdata' CHECK ("doc_type" IN ('techdata')),
  "seq"        INTEGER NOT NULL DEFAULT 0,
  "key"        TEXT NOT NULL CHECK ("key" ~ '^[a-z][a-z0-9_]{0,30}$'),
  "label"      TEXT NOT NULL CHECK (length("label") BETWEEN 1 AND 60),
  "unit"       TEXT NOT NULL DEFAULT '',
  "source"     TEXT NOT NULL CHECK ("source" IN ('macro','snapshot')),
  "ref"        TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "output_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "output_item_ref" CHECK (("source" = 'macro' AND "ref" IS NULL) OR ("source" = 'snapshot' AND "ref" IS NOT NULL))
);
CREATE UNIQUE INDEX "output_item_tenant_id_doc_type_key_key" ON "output_item" ("tenant_id","doc_type","key");

CREATE TABLE "graph_def" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "doc_type"   TEXT NOT NULL DEFAULT 'techdata' CHECK ("doc_type" IN ('techdata')),
  "seq"        INTEGER NOT NULL DEFAULT 0,
  "name"       TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 60),
  "chart"      TEXT NOT NULL CHECK ("chart" IN ('bar','line')),
  "x_label"    TEXT NOT NULL DEFAULT '',
  "y_label"    TEXT NOT NULL DEFAULT '',
  "points"     JSONB NOT NULL CHECK (jsonb_typeof("points") = 'array' AND jsonb_array_length("points") BETWEEN 1 AND 50),
  "marker_key" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by" UUID NOT NULL,
  CONSTRAINT "graph_def_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "graph_def_tenant_id_doc_type_name_key" ON "graph_def" ("tenant_id","doc_type","name");

CREATE TABLE "table_meta" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "product_code" TEXT NOT NULL CHECK (length("product_code") BETWEEN 1 AND 40),
  "table_name"   TEXT NOT NULL CHECK (length("table_name") BETWEEN 1 AND 40),
  "table_type"   TEXT NOT NULL CHECK ("table_type" IN ('variant','tech','material')),
  "department"   TEXT NOT NULL DEFAULT '',
  "description"  TEXT NOT NULL DEFAULT '',
  "variant_of"   TEXT,
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_by"   UUID NOT NULL,
  CONSTRAINT "table_meta_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "table_meta_variant" CHECK ("variant_of" IS NULL OR ("table_type" = 'variant' AND "variant_of" <> "table_name"))
);
CREATE UNIQUE INDEX "table_meta_tenant_id_product_code_table_name_key" ON "table_meta" ("tenant_id","product_code","table_name");

ALTER TABLE "output_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "output_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "output_item"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER TABLE "graph_def" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "graph_def" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "graph_def"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER TABLE "table_meta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_meta" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "table_meta"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON "output_item" TO edim_app;
REVOKE UPDATE ON "output_item" FROM edim_app;
GRANT SELECT, INSERT, DELETE ON "graph_def" TO edim_app;
REVOKE UPDATE ON "graph_def" FROM edim_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "table_meta" TO edim_app;
