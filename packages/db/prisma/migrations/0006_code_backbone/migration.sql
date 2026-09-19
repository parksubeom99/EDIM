-- P1 (GAP1 = code-based BOM): BOM Code Set-Up registrations + run snapshot.
-- EDIM.pdf p31 Sub Code · p33 Product Code (+ "Table 참조") · p34 Product Code
-- Relationship (Child Group, Part List Running Test). Additive only: no existing
-- table is altered. Tenant-scoped, ENABLE + FORCE RLS, same policy as 0002_rls.
-- bom_code_run is an append-only SNAPSHOT (DATA_MODEL BOM/BOMLine re-homed here).

CREATE TABLE "sub_code" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   uuid NOT NULL,
  "group_name"  text NOT NULL,
  "item_key"    text NOT NULL,
  "item_name"   text NOT NULL,
  "seq"         integer NOT NULL,
  "value"       text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "created_at"  timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"  uuid NOT NULL,
  CONSTRAINT "sub_code_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sub_code_item_key_check" CHECK ("item_key" IN ('A','B','C','D','E','F')),
  CONSTRAINT "sub_code_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sub_code_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sub_code_tenant_group_item_value_key" ON "sub_code" ("tenant_id", "group_name", "item_key", "value");
CREATE UNIQUE INDEX "sub_code_tenant_group_item_seq_key" ON "sub_code" ("tenant_id", "group_name", "item_key", "seq");

CREATE TABLE "product_code" (
  "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid NOT NULL,
  "code"              text NOT NULL,
  "name"              text NOT NULL,
  "kind"              text NOT NULL,
  "category"          text NOT NULL DEFAULT '',
  "unit"              text NOT NULL DEFAULT 'ea',
  "spec_template"     text NOT NULL DEFAULT '',
  "material_template" text NOT NULL DEFAULT '',
  "tables"            jsonb NOT NULL DEFAULT '{}'::jsonb,
  "sections"          jsonb,
  "created_at"        timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at"        timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"        uuid NOT NULL,
  CONSTRAINT "product_code_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_code_kind_check" CHECK ("kind" IN ('product','part','purchase')),
  CONSTRAINT "product_code_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_code_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "product_code_tenant_code_key" ON "product_code" ("tenant_id", "code");

CREATE TABLE "code_relationship" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   uuid NOT NULL,
  "parent_code" text NOT NULL,
  "child_code"  text NOT NULL,
  "seq"         integer NOT NULL,
  "section"     text NOT NULL,
  "qty"         jsonb NOT NULL,
  "unit_cost"   jsonb NOT NULL,
  "when_cond"   jsonb,
  "remarks"     text,
  "created_at"  timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"  uuid NOT NULL,
  CONSTRAINT "code_relationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "code_relationship_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "code_relationship_parent_fkey" FOREIGN KEY ("tenant_id", "parent_code") REFERENCES "product_code" ("tenant_id", "code") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "code_relationship_child_fkey" FOREIGN KEY ("tenant_id", "child_code") REFERENCES "product_code" ("tenant_id", "code") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "code_relationship_no_self" CHECK ("parent_code" <> "child_code"),
  CONSTRAINT "code_relationship_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "code_relationship_tenant_parent_seq_key" ON "code_relationship" ("tenant_id", "parent_code", "seq");
CREATE INDEX "code_relationship_tenant_child_idx" ON "code_relationship" ("tenant_id", "child_code");

CREATE TABLE "bom_code_run" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL,
  "hierarchy_stable" uuid,
  "code"             text NOT NULL,
  "slots"            jsonb NOT NULL,
  "macro_value"      double precision,
  "parent_code"      text NOT NULL,
  "catalog_fp"       text NOT NULL,
  "lines"            jsonb NOT NULL,
  "cost"             jsonb NOT NULL,
  "source"           text NOT NULL DEFAULT 'workbench',
  "created_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"       uuid NOT NULL,
  CONSTRAINT "bom_code_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bom_code_run_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bom_code_run_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "bom_code_run_tenant_node_idx" ON "bom_code_run" ("tenant_id", "hierarchy_stable", "created_at" DESC);

ALTER TABLE "sub_code"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sub_code"          FORCE ROW LEVEL SECURITY;
ALTER TABLE "product_code"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_code"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "code_relationship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "code_relationship" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bom_code_run"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bom_code_run"      FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "sub_code"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY tenant_isolation ON "product_code"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY tenant_isolation ON "code_relationship"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY tenant_isolation ON "bom_code_run"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "sub_code", "product_code", "code_relationship" TO edim_app;
GRANT SELECT, INSERT ON "bom_code_run" TO edim_app;
REVOKE UPDATE, DELETE ON "bom_code_run" FROM edim_app;  -- snapshot: append-only by construction
