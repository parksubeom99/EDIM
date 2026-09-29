-- 0037 · ccmd K · KB-2 — 컨설팅 트랙 2: 익명 · 집계 벤치마킹("업계 안 우리 위치").
-- 경계 원칙(회장님 P3-a Q2 결정과 맞춤): 플랫폼 관리자가 회사 업무 행을 읽는 길은 여전히 열지 않는다.
--   회사(edim_app)는 DB 함수 하나로 **집계 숫자만** 받는다 — 회사 id · 회사 이름 · 행 값은 돌려주지 않는다.
--   부르는 회사는 app.current_tenant 로 정해진다 — 인자로 다른 회사를 지정할 수 없다.
--   k-익명 하한: 값이 있는 회사가 3곳 미만이면 분포(p25 · p50 · p75 · 백분위)를 NULL 로 · suppressed = true.
-- 추가만: 표본 표 하나(benchmark_sample) + 함수 하나. 되돌리기: DROP FUNCTION public.benchmark_metrics(text); DROP TABLE public.benchmark_sample;

-- 표본 회사(샘플) — 시연 DB 에 회사가 둘뿐이라 k-익명 하한(3)을 넘길 표본이 없다. 표본 회사 값을 **회사 행(tenant)이 아니라** 이 표에 둔다
-- (tenant 로 만들면 플랫폼 콘솔 · 학습 투영의 회사 목록 = 시연 장면 8 · 12 화면이 바뀐다). 회사 업무 표가 아니므로 tenant_id 가 없다.
-- 아무 앱 역할도 읽지 못한다 — RLS ENABLE · FORCE + 정책 없음(= 전부 거부) + 권한 회수. 함수(소유자)만 읽는다.
CREATE TABLE "benchmark_sample" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "label"      TEXT NOT NULL CHECK ("label" LIKE '%샘플%'),
  "cost_total" NUMERIC NOT NULL CHECK ("cost_total" > 0),
  "material"   NUMERIC NOT NULL CHECK ("material" >= 0),
  "labor"      NUMERIC NOT NULL CHECK ("labor" >= 0),
  "q_cmh"      NUMERIC NULL CHECK ("q_cmh" IS NULL OR "q_cmh" > 0),
  "fan_eta"    NUMERIC NULL CHECK ("fan_eta" IS NULL OR ("fan_eta" > 0 AND "fan_eta" < 1)),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "benchmark_sample_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "benchmark_sample_label_key" UNIQUE ("label")
);
ALTER TABLE "benchmark_sample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "benchmark_sample" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON "benchmark_sample" FROM PUBLIC;
REVOKE ALL ON "benchmark_sample" FROM edim_app;

-- 지표 3종(숫자만):
--   cost_per_cmh   풍량당 원가(₩/CMH) = 원가 합계 ÷ 풍량(스냅샷 dims.special.input.q_cmh)
--   material_ratio 재료비 비율 = 재료비 ÷ 직접원가(재료비 + 인건비)
--   fan_eta        팬 효율 η(스냅샷 dims.special.result.eta)
-- 회사마다 **최신 BOM 스냅샷 1개**로 값 1개. 그 스냅샷에 값이 없으면 그 회사는 표본에서 빠진다(지어내지 않는다).
CREATE OR REPLACE FUNCTION public.benchmark_metrics(metric text)
RETURNS TABLE (metric_key text, n_tenants integer, p25 numeric, p50 numeric, p75 numeric, my_value numeric, my_percentile numeric, suppressed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
  k CONSTANT integer := 3;
BEGIN
  IF metric IS NULL OR metric NOT IN ('cost_per_cmh', 'material_ratio', 'fan_eta') THEN
    RAISE EXCEPTION 'unknown benchmark metric %', metric USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF me IS NULL THEN
    RAISE EXCEPTION 'benchmark_metrics needs a tenant context' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (r.tenant_id) r.tenant_id, r.dims, r.cost
    FROM "bom_code_run" r
    ORDER BY r.tenant_id, r.created_at DESC, r.id DESC
  ), tv AS (
    SELECT l.tenant_id AS who,
      CASE metric
        WHEN 'cost_per_cmh' THEN (l.cost->>'total')::numeric / NULLIF((l.dims->'special'->'input'->>'q_cmh')::numeric, 0)
        WHEN 'material_ratio' THEN (l.cost->>'material')::numeric / NULLIF((l.cost->>'material')::numeric + (l.cost->>'labor')::numeric, 0)
        ELSE (l.dims->'special'->'result'->>'eta')::numeric
      END AS v
    FROM latest l
  ), sv AS (
    SELECT NULL::uuid AS who,
      CASE metric
        WHEN 'cost_per_cmh' THEN s.cost_total / NULLIF(s.q_cmh, 0)
        WHEN 'material_ratio' THEN s.material / NULLIF(s.material + s.labor, 0)
        ELSE s.fan_eta
      END AS v
    FROM "benchmark_sample" s
  ), pool AS (
    SELECT who, v FROM tv WHERE v IS NOT NULL
    UNION ALL
    SELECT who, v FROM sv WHERE v IS NOT NULL
  ), agg AS (
    SELECT count(*)::integer AS n,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY v) AS q1,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY v) AS q2,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY v) AS q3
    FROM pool
  ), mine AS (
    SELECT v FROM pool WHERE who = me LIMIT 1
  )
  SELECT metric,
    a.n,
    CASE WHEN a.n >= k THEN round(a.q1::numeric, 4) END,
    CASE WHEN a.n >= k THEN round(a.q2::numeric, 4) END,
    CASE WHEN a.n >= k THEN round(a.q3::numeric, 4) END,
    round((SELECT m.v FROM mine m), 4),
    CASE WHEN a.n >= k AND EXISTS (SELECT 1 FROM mine)
      THEN round(100.0 * (SELECT count(*) FROM pool p WHERE p.v <= (SELECT m.v FROM mine m)) / a.n, 1) END,
    a.n < k
  FROM agg a;
END;
$$;
REVOKE ALL ON FUNCTION public.benchmark_metrics(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.benchmark_metrics(text) TO edim_app;
