-- P3-a: 플랫폼 관리자 계층 + DB①/DB② 소유 분리 · 역류 차단 (구조만).
-- 근거: 확정 장부(3계층 권한 · DB①=관리자 학습 DB · DB②=회사 메인 DB · 역류 금지),
--       EDIM.pdf p54("AI 학습은 Platform 제공자만" · "System DB에 영향을 주는 것은 Platform 승인" · "2. User Management").
--
-- 핵심: DB①/DB②를 코드 규약이 아니라 **DB 권한**으로 가른다.
--   public   스키마 = DB② (회사별 RLS, edim_app 이 접속)
--   platform 스키마 = DB① (관리자 소유, edim_platform 만 접속)
-- 두 역할의 권한 교차가 없으므로 앱 코드에 버그가 있어도 DB가 거부한다.
-- 추가만 하는 마이그레이션 — 기존 테이블·정책은 건드리지 않는다.

-- 1) DB① 스키마 + 전용 접속 역할 ---------------------------------------------
CREATE SCHEMA IF NOT EXISTS "platform";
REVOKE ALL ON SCHEMA "platform" FROM PUBLIC;  -- 기본 비공개(edim_app 은 USAGE 조차 없음)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edim_platform') THEN
    CREATE ROLE edim_platform LOGIN PASSWORD 'edim_platform';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "platform" TO edim_platform;

-- 플랫폼 관리자 등록부. 테넌트 밖의 주체 — membership 이 아니다.
CREATE TABLE "platform"."admin_user" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL,
  "title"      text NOT NULL DEFAULT '',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "admin_user_user_id_key" ON "platform"."admin_user" ("user_id");

-- 학습 원천자료 골격. P3-a 에서는 **비어 있다**(권한 검증용 뼈대).
-- 내용물·파이프라인·프로젝션은 P3-b(회장님 DXF 연구 결과 후).
CREATE TABLE "platform"."learning_source" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "kind"       text NOT NULL,
  "title"      text NOT NULL,
  "note"       text NOT NULL DEFAULT '',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "learning_source_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_source_kind_check" CHECK ("kind" IN ('drawing','techdoc'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "platform" TO edim_platform;
ALTER DEFAULT PRIVILEGES IN SCHEMA "platform"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO edim_platform;

-- 2) 회사 → 플랫폼으로 올라가는 정당한 통로 (DB② 안, 요청서 한 곳) -------------
-- 업무 데이터가 아니라 "요청서"다. 플랫폼은 이 테이블만 읽고 결정만 쓴다.
-- Q1 = 좁게(회장님 2026-09-19): 첫 종류는 Special 의뢰/문의뿐.
CREATE TABLE "platform_request" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid NOT NULL,
  "kind"          text NOT NULL,
  "subject"       text NOT NULL,
  "payload"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "state"         text NOT NULL DEFAULT 'requested',
  "requested_by"  uuid NOT NULL,
  "requested_at"  timestamptz(6) NOT NULL DEFAULT now(),
  "decided_by"    uuid,
  "decided_at"    timestamptz(6),
  "decision_note" text NOT NULL DEFAULT '',
  CONSTRAINT "platform_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_request_kind_check" CHECK ("kind" IN ('special','question')),
  CONSTRAINT "platform_request_state_check" CHECK ("state" IN ('requested','approved','rejected')),
  CONSTRAINT "platform_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_request_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "app_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "platform_request_tenant_idx" ON "platform_request" ("tenant_id", "requested_at" DESC);
CREATE INDEX "platform_request_state_idx" ON "platform_request" ("state", "requested_at" DESC);

ALTER TABLE "platform_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_request" FORCE ROW LEVEL SECURITY;

-- 회사 쪽: 자기 테넌트 것만 (0002 와 같은 GUC 정책)
CREATE POLICY tenant_isolation ON "platform_request"
  USING      (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 플랫폼 쪽: 대기열을 보려면 테넌트 전체가 보여야 한다. RLS 는 FORCE 라 정책이
-- 없으면 플랫폼 역할도 0행이 된다 → 이 역할에만 열어주는 정책을 따로 둔다.
CREATE POLICY platform_queue ON "platform_request"
  AS PERMISSIVE FOR ALL TO edim_platform
  USING (true) WITH CHECK (true);

-- 3) 권한 교차 부재 = 역류 차단 -----------------------------------------------
-- (a) 회사 역할: 요청서를 올리고 읽을 수만 있다. 결정(state/decided_*)은 못 바꾼다.
--     0002 의 ALTER DEFAULT PRIVILEGES 가 새 public 테이블에 UPDATE/DELETE 까지
--     자동으로 주므로, 명시적으로 회수해야 한다.
GRANT SELECT, INSERT ON "platform_request" TO edim_app;
REVOKE UPDATE, DELETE ON "platform_request" FROM edim_app;

-- (b) 플랫폼 역할: public 에서는 tenant 목록과 요청서만. 업무 테이블 권한 0.
GRANT USAGE ON SCHEMA "public" TO edim_platform;
GRANT SELECT ON "tenant" TO edim_platform;
GRANT SELECT ON "platform_request" TO edim_platform;
GRANT UPDATE ("state", "decided_by", "decided_at", "decision_note") ON "platform_request" TO edim_platform;
-- 그 외 public 테이블(product_code · bom_code_run · project · membership · hierarchy_node …)에는
-- 어떤 권한도 주지 않는다. public 의 ALTER DEFAULT PRIVILEGES 는 edim_app 대상이므로
-- edim_platform 은 앞으로 생길 업무 테이블도 자동으로 받지 않는다.
