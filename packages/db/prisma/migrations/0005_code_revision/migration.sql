-- Tier B: RCCS assembled-code persistence + revision history (EDIM.pdf p24, p12).
-- Tenant-scoped, ENABLE + FORCE RLS with the same app.current_tenant policy as
-- 0002_rls. Append-only: a change is a new rev_no, never an UPDATE.

CREATE TABLE "code_revision" (
  "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid        NOT NULL,
  "hierarchy_stable" uuid        NOT NULL,
  "rev_no"           integer     NOT NULL,
  "code"             text        NOT NULL,
  "slots"            jsonb       NOT NULL,
  "reason"           text,
  "created_at"       timestamptz(6) NOT NULL DEFAULT now(),
  "created_by"       uuid        NOT NULL,
  CONSTRAINT "code_revision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "code_revision_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "code_revision_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES "app_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "code_revision_tenant_id_hierarchy_stable_rev_no_key"
  ON "code_revision" ("tenant_id", "hierarchy_stable", "rev_no");
CREATE INDEX "code_revision_tenant_id_hierarchy_stable_idx"
  ON "code_revision" ("tenant_id", "hierarchy_stable");

ALTER TABLE "code_revision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "code_revision" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "code_revision"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
GRANT SELECT, INSERT ON "code_revision" TO edim_app;
REVOKE UPDATE, DELETE ON "code_revision" FROM edim_app;  -- append-only by construction
