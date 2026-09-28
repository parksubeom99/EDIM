-- 0033 · B 학습 AI 1수준 + 이중 프로젝션 (ccmd J). **추가만** — 기존 표·정책은 건드리지 않는다.
--
-- DB① (platform 스키마, edim_platform 만): 원천 자료 → 학습 작업(계획·단계) → 특징 → 공식 후보 → 투영 기록.
-- DB② (public, 회사별 RLS): learned_suggestion — 투영된 공식이 회사에 도착하는 **착지 표** 하나.
-- 두 쪽을 잇는 쓰기는 SECURITY DEFINER 함수 platform.project_formula 하나뿐이다(승인된 공식만 · 1행씩).
--   edim_app      : platform 스키마 권한 0(0007 그대로) · learned_suggestion 은 SELECT + state/adopted_macro_id UPDATE 만
--   edim_platform : public 업무 표 권한 0(0007 그대로) · learned_suggestion 도 권한 0 — 함수로만 넣는다

-- 1) 원천 자료 — 0007 의 뼈대에 열을 더한다 -------------------------------------
ALTER TABLE "platform"."learning_source"
  ADD COLUMN "file_key"   text,
  ADD COLUMN "sha256"     text,
  ADD COLUMN "origin"     text NOT NULL DEFAULT 'upload',
  ADD COLUMN "is_sample"  boolean NOT NULL DEFAULT false,
  ADD COLUMN "content"    bytea,
  ADD COLUMN "byte_size"  integer,
  ADD COLUMN "monitor"    jsonb;
CREATE UNIQUE INDEX "learning_source_sha256_key" ON "platform"."learning_source" ("sha256");

-- 2) 학습 작업 = 계획(단계 목록) + 단계 기록(작업 그래프 · 비용) --------------------
CREATE TABLE "platform"."learning_job" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "title"       text NOT NULL,
  "plan"        jsonb NOT NULL,
  "state"       text NOT NULL DEFAULT 'planned',
  "created_by"  uuid NOT NULL,
  "created_at"  timestamptz(6) NOT NULL DEFAULT now(),
  "finished_at" timestamptz(6),
  CONSTRAINT "learning_job_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_job_state_check" CHECK ("state" IN ('planned','running','done','failed'))
);

CREATE TABLE "platform"."learning_step" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "job_id"      uuid NOT NULL,
  "seq"         integer NOT NULL,
  "tool"        text NOT NULL,
  "state"       text NOT NULL DEFAULT 'waiting',
  "input"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "output_ref"  jsonb,
  "error"       text,
  "cost"        jsonb,
  "started_at"  timestamptz(6),
  "finished_at" timestamptz(6),
  CONSTRAINT "learning_step_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_step_job_fkey" FOREIGN KEY ("job_id") REFERENCES "platform"."learning_job" ("id") ON DELETE CASCADE,
  CONSTRAINT "learning_step_state_check" CHECK ("state" IN ('waiting','running','done','failed')),
  CONSTRAINT "learning_step_job_seq_key" UNIQUE ("job_id", "seq")
);

-- 3) 특징(extract 가 넣고 align 이 aligned_* 를 채운다) ------------------------------
CREATE TABLE "platform"."learning_feature" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "job_id"       uuid NOT NULL,
  "source_id"    uuid NOT NULL,
  "record"       integer NOT NULL DEFAULT 0,
  "name"         text NOT NULL,
  "value"        numeric NOT NULL,
  "unit"         text NOT NULL DEFAULT '',
  "raw_label"    text NOT NULL,
  "layer"        text NOT NULL DEFAULT '',
  "via"          text NOT NULL,
  "aligned_name" text,
  "aligned_by"   text,
  "aligned_value" numeric,
  "aligned_slot" text,
  "created_at"   timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "learning_feature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_feature_job_fkey" FOREIGN KEY ("job_id") REFERENCES "platform"."learning_job" ("id") ON DELETE CASCADE,
  CONSTRAINT "learning_feature_source_fkey" FOREIGN KEY ("source_id") REFERENCES "platform"."learning_source" ("id") ON DELETE CASCADE
);
CREATE INDEX "learning_feature_job_idx" ON "platform"."learning_feature" ("job_id", "source_id", "record");

-- 4) 공식 후보 → 승인(라벨) -------------------------------------------------------
CREATE TABLE "platform"."learning_formula" (
  "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
  "job_id"          uuid NOT NULL,
  "target"          text NOT NULL,
  "expression"      text NOT NULL,
  "user_target"     text,
  "user_expression" text,
  "fit"             jsonb NOT NULL,
  "support_sources" integer NOT NULL,
  "outliers"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "verify"          jsonb,
  "description"     text NOT NULL DEFAULT '',
  "local_ai_note"   text,
  "state"           text NOT NULL DEFAULT 'proposed',
  "decided_by"      uuid,
  "decided_at"      timestamptz(6),
  "note"            text NOT NULL DEFAULT '',
  "created_at"      timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "learning_formula_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_formula_job_fkey" FOREIGN KEY ("job_id") REFERENCES "platform"."learning_job" ("id") ON DELETE CASCADE,
  CONSTRAINT "learning_formula_state_check" CHECK ("state" IN ('proposed','approved','rejected'))
);

-- 5) 투영 기록 — 누가 어느 회사로 무엇을 내보냈나 ------------------------------------
CREATE TABLE "platform"."projection_log" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "formula_id"   uuid NOT NULL,
  "tenant_id"    uuid NOT NULL,
  "suggestion_id" uuid NOT NULL,
  "projected_at" timestamptz(6) NOT NULL DEFAULT now(),
  "by"           uuid,
  CONSTRAINT "projection_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projection_log_formula_fkey" FOREIGN KEY ("formula_id") REFERENCES "platform"."learning_formula" ("id") ON DELETE CASCADE,
  CONSTRAINT "projection_log_formula_tenant_key" UNIQUE ("formula_id", "tenant_id")
);

-- 0007 의 ALTER DEFAULT PRIVILEGES 가 새 platform 표에 edim_platform 권한을 준다. 확인 차 명시.
GRANT SELECT, INSERT, UPDATE, DELETE ON "platform"."learning_job", "platform"."learning_step", "platform"."learning_feature",
  "platform"."learning_formula", "platform"."projection_log" TO edim_platform;
-- 투영 기록은 쌓기만(플랫폼도 고치거나 지우지 못한다 — 누가 무엇을 내보냈는지의 근거)
REVOKE UPDATE, DELETE ON "platform"."projection_log" FROM edim_platform;

-- 6) DB② 착지 표 -----------------------------------------------------------------
CREATE TABLE "learned_suggestion" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid NOT NULL,
  "formula_ref"      uuid NOT NULL,
  "target"           text,
  "expression"       text,
  "learned_target"   text NOT NULL,
  "learned_expression" text NOT NULL,
  "fit"              jsonb NOT NULL,
  "description"      text NOT NULL DEFAULT '',
  "state"            text NOT NULL DEFAULT 'offered',
  "adopted_macro_id" uuid,
  "created_at"       timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "learned_suggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learned_suggestion_state_check" CHECK ("state" IN ('offered','adopted','dismissed')),
  CONSTRAINT "learned_suggestion_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "learned_suggestion_formula_tenant_key" UNIQUE ("formula_ref", "tenant_id")
);
CREATE INDEX "learned_suggestion_tenant_idx" ON "learned_suggestion" ("tenant_id", "created_at" DESC);

ALTER TABLE "learned_suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learned_suggestion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "learned_suggestion"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- public 의 ALTER DEFAULT PRIVILEGES(0002)가 edim_app 에 SELECT/INSERT/UPDATE/DELETE 를 줬다 → 좁힌다.
REVOKE ALL ON "learned_suggestion" FROM edim_app;
GRANT SELECT ON "learned_suggestion" TO edim_app;
GRANT UPDATE ("state", "adopted_macro_id") ON "learned_suggestion" TO edim_app;
REVOKE ALL ON "learned_suggestion" FROM edim_platform;

-- 7) 한쪽 방향 다리 — 승인된 공식만 · 착지 표 1행 + 투영 기록 1행 · 그 밖엔 아무것도 하지 않는다 ---
--    투영에서 빠지는 것: 원천 id · 파일 · 특징 원값 · 원래 이름 · 출처(origin) — 식 · 목표 · 적합도 요약만 간다.
CREATE OR REPLACE FUNCTION "platform"."project_formula"(p_formula_id uuid, p_tenant_id uuid, p_by uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, platform
AS $$
DECLARE
  f  platform.learning_formula%ROWTYPE;
  sid uuid;
BEGIN
  SELECT * INTO f FROM platform.learning_formula WHERE id = p_formula_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'formula % not found', p_formula_id USING ERRCODE = 'P0002'; END IF;
  IF f.state <> 'approved' THEN RAISE EXCEPTION 'formula % is %, not approved', p_formula_id, f.state USING ERRCODE = 'P0001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenant WHERE id = p_tenant_id) THEN RAISE EXCEPTION 'tenant % not found', p_tenant_id USING ERRCODE = 'P0002'; END IF;
  -- 착지 표는 RLS FORCE — 소유자가 슈퍼유저가 아닌 환경에서도 그 회사 행으로만 들어가게 GUC 를 이 트랜잭션에만 건다
  PERFORM set_config('app.current_tenant', p_tenant_id::text, true);
  INSERT INTO public.learned_suggestion (tenant_id, formula_ref, target, expression, learned_target, learned_expression, fit, description)
  VALUES (p_tenant_id, f.id, f.user_target, f.user_expression, f.target, f.expression,
          jsonb_build_object('n', f.fit->'n', 'maxAbsErr', f.fit->'maxAbsErr', 'rmse', f.fit->'rmse', 'coverage', f.fit->'coverage'),
          f.description)
  RETURNING id INTO sid;
  INSERT INTO platform.projection_log (formula_id, tenant_id, suggestion_id, by) VALUES (f.id, p_tenant_id, sid, p_by);
  PERFORM set_config('app.current_tenant', '', true);
  RETURN sid;
END
$$;
REVOKE ALL ON FUNCTION "platform"."project_formula"(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."project_formula"(uuid, uuid, uuid) TO edim_platform;
