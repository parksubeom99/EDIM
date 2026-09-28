-- 0034 · C Special Tool Box 첫 사례 — 팬 선정 (ccmd J). **추가만**.
--
-- DB① (platform): special_program(프로그램 정의 · 단가) · fan_curve(샘플 팬 성능표 — 관리자 자료).
-- DB② (public, 회사별 RLS): special_grant(이 회사가 쓸 수 있는 Special) · special_run(사용 기록 = 과금 근거 · 불변)
--                          · tenant_fan_curve(회사 자체 팬 표 — 바인딩 source=tenant 증명용).
-- 다리 둘(SECURITY DEFINER):
--   platform.grant_special(request_id, program_key, by) — 승인된 Special 의뢰에만 · 그 회사에 grant 1행(edim_platform 만)
--   public.special_fan_candidates(q, p)                 — 곡선 원자료가 아니라 **교점을 품은 한 구간(점 2개)** 만(edim_app 만 · grant 있는 회사만)
-- edim_app 은 platform 스키마 권한 0 그대로(함수는 public 에 둔다 — 스키마 USAGE 를 넓히지 않으려고).

-- 1) DB① ------------------------------------------------------------------------
CREATE TABLE "platform"."special_program" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "key"           text NOT NULL,
  "version"       integer NOT NULL DEFAULT 1,
  "title"         text NOT NULL,
  "ui_form_ref"   jsonb NOT NULL DEFAULT '{}'::jsonb,
  "binding"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "price_per_run" numeric NOT NULL DEFAULT 0,
  "currency"      text NOT NULL DEFAULT 'KRW',
  "state"         text NOT NULL DEFAULT 'active',
  "is_sample"     boolean NOT NULL DEFAULT false,
  "created_at"    timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "special_program_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "special_program_key_key" UNIQUE ("key"),
  CONSTRAINT "special_program_state_check" CHECK ("state" IN ('active','retired'))
);

CREATE TABLE "platform"."fan_curve" (
  "id"        uuid NOT NULL DEFAULT gen_random_uuid(),
  "model"     text NOT NULL,
  "rpm"       integer NOT NULL,
  "q_cmh"     numeric NOT NULL,
  "p_pa"      numeric NOT NULL,
  "eta"       numeric NOT NULL,
  "shaft_kw"  numeric,
  "is_sample" boolean NOT NULL DEFAULT false,
  CONSTRAINT "fan_curve_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fan_curve_point_key" UNIQUE ("model", "rpm", "q_cmh")
);
GRANT SELECT, INSERT, UPDATE, DELETE ON "platform"."special_program", "platform"."fan_curve" TO edim_platform;

-- 2) DB② — 권한 · 사용 기록 · 회사 자체 표 ----------------------------------------------
CREATE TABLE "special_grant" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid NOT NULL,
  "program_key"   text NOT NULL,
  "version"       integer NOT NULL,
  "title"         text NOT NULL,
  "price_per_run" numeric NOT NULL,
  "currency"      text NOT NULL,
  "binding"       jsonb NOT NULL,
  "form_id"       uuid,
  "request_id"    uuid NOT NULL,
  "granted_by"    uuid,
  "granted_at"    timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "special_grant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "special_grant_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "special_grant_tenant_program_key" UNIQUE ("tenant_id", "program_key")
);
CREATE TABLE "special_run" (
  "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid NOT NULL,
  "program_key"    text NOT NULL,
  "version"        integer NOT NULL,
  "input"          jsonb NOT NULL,
  "result"         jsonb NOT NULL,
  "binding_source" text NOT NULL,
  "price"          numeric NOT NULL,
  "currency"       text NOT NULL,
  "created_by"     uuid NOT NULL,
  "created_at"     timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "special_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "special_run_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "special_run_source_check" CHECK ("binding_source" IN ('platform','tenant'))
);
CREATE INDEX "special_run_tenant_idx" ON "special_run" ("tenant_id", "created_at" DESC);
CREATE TABLE "tenant_fan_curve" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid NOT NULL,
  "model"      text NOT NULL,
  "rpm"        integer NOT NULL,
  "q_cmh"      numeric NOT NULL,
  "p_pa"       numeric NOT NULL,
  "eta"        numeric NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_fan_curve_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_fan_curve_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['special_grant','special_run','tenant_fan_curve'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I
      USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)$p$, t);
  END LOOP;
END
$$;

-- 권한: grant 는 읽기만(부여는 함수로만) · run 은 읽기·쓰기만(고치기·지우기 없음 — 과금 근거) · 회사 자체 표는 회사 것
REVOKE ALL ON "special_grant" FROM edim_app;
GRANT SELECT ON "special_grant" TO edim_app;
REVOKE ALL ON "special_run" FROM edim_app;
GRANT SELECT, INSERT ON "special_run" TO edim_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_fan_curve" TO edim_app;
-- 플랫폼은 과금에 필요한 것만 본다 — 부여 목록 · 사용 기록의 금액 칸(입력·결과 값은 못 본다). 회사 자체 표는 권한 0.
GRANT SELECT ON "special_grant" TO edim_platform;
GRANT SELECT ("id", "tenant_id", "program_key", "version", "price", "currency", "created_at") ON "special_run" TO edim_platform;
CREATE POLICY platform_billing ON "special_grant" AS PERMISSIVE FOR SELECT TO edim_platform USING (true);
CREATE POLICY platform_billing ON "special_run" AS PERMISSIVE FOR SELECT TO edim_platform USING (true);

-- 3) 다리 ① — 승인된 Special 의뢰 → 그 회사에 grant ------------------------------------
CREATE OR REPLACE FUNCTION "platform"."grant_special"(p_request_id uuid, p_program_key text, p_by uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, platform
AS $$
DECLARE
  r  public.platform_request%ROWTYPE;
  pr platform.special_program%ROWTYPE;
  fid uuid;
  gid uuid;
BEGIN
  SELECT * INTO r FROM public.platform_request WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request % not found', p_request_id USING ERRCODE = 'P0002'; END IF;
  IF r.kind <> 'special' OR r.state <> 'approved' THEN RAISE EXCEPTION 'request % is %/%, not an approved special', p_request_id, r.kind, r.state USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO pr FROM platform.special_program WHERE key = p_program_key AND state = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'program % not active', p_program_key USING ERRCODE = 'P0002'; END IF;
  BEGIN fid := NULLIF(r.payload->>'formId', '')::uuid; EXCEPTION WHEN others THEN fid := NULL; END;
  PERFORM set_config('app.current_tenant', r.tenant_id::text, true);
  INSERT INTO public.special_grant (tenant_id, program_key, version, title, price_per_run, currency, binding, form_id, request_id, granted_by)
  VALUES (r.tenant_id, pr.key, pr.version, pr.title, pr.price_per_run, pr.currency, pr.binding, fid, r.id, p_by)
  ON CONFLICT (tenant_id, program_key) DO UPDATE SET version = EXCLUDED.version, price_per_run = EXCLUDED.price_per_run, form_id = COALESCE(EXCLUDED.form_id, public.special_grant.form_id), request_id = EXCLUDED.request_id
  RETURNING id INTO gid;
  PERFORM set_config('app.current_tenant', '', true);
  RETURN gid;
END
$$;
REVOKE ALL ON FUNCTION "platform"."grant_special"(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "platform"."grant_special"(uuid, text, uuid) TO edim_platform;

-- 4) 다리 ② — 팬 선정 실행이 부르는 후보(교점을 품은 구간 하나씩 · 곡선 원자료 아님) -------------
CREATE OR REPLACE FUNCTION "public"."special_fan_candidates"(p_q numeric, p_p numeric)
RETURNS TABLE (model text, rpm integer, q1 numeric, p1 numeric, e1 numeric, q2 numeric, p2 numeric, e2 numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, platform
AS $$
DECLARE
  k numeric;
  t uuid := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
BEGIN
  IF p_q IS NULL OR p_q <= 0 OR p_p IS NULL OR p_p <= 0 THEN RAISE EXCEPTION 'q, p must be positive' USING ERRCODE = '22023'; END IF;
  IF t IS NULL OR NOT EXISTS (SELECT 1 FROM public.special_grant g WHERE g.tenant_id = t AND g.program_key = 'fan-select') THEN
    RAISE EXCEPTION 'no fan-select grant for this tenant' USING ERRCODE = '42501';
  END IF;
  k := p_p / (p_q * p_q);
  RETURN QUERY
  WITH pts AS (
    SELECT c.model, c.rpm, c.q_cmh, c.p_pa, c.eta,
           lead(c.q_cmh) OVER w AS nq, lead(c.p_pa) OVER w AS np, lead(c.eta) OVER w AS ne
      FROM platform.fan_curve c
    WINDOW w AS (PARTITION BY c.model, c.rpm ORDER BY c.q_cmh)
  ), seg AS (
    SELECT DISTINCT ON (pts.model, pts.rpm) pts.model, pts.rpm, pts.q_cmh, pts.p_pa, pts.eta, pts.nq, pts.np, pts.ne
      FROM pts
     WHERE pts.nq IS NOT NULL AND (pts.p_pa - k * pts.q_cmh * pts.q_cmh) * (pts.np - k * pts.nq * pts.nq) <= 0
     ORDER BY pts.model, pts.rpm, pts.q_cmh
  ), curves AS (SELECT DISTINCT c.model, c.rpm FROM platform.fan_curve c)
  SELECT cv.model, cv.rpm, s.q_cmh, s.p_pa, s.eta, s.nq, s.np, s.ne
    FROM curves cv LEFT JOIN seg s ON s.model = cv.model AND s.rpm = cv.rpm
   ORDER BY cv.model, cv.rpm;
END
$$;
REVOKE ALL ON FUNCTION "public"."special_fan_candidates"(numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."special_fan_candidates"(numeric, numeric) TO edim_app;
