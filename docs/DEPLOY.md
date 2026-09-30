# EDIM 배포 킷 — 로컬 운영 실행 · 환경변수 · 클라우드로 옮길 때

> 이 문서는 **이 저장소만으로** 운영 모드를 띄우는 방법이다. 특정 클라우드 계정 작업은 하지 않았다(설계 결정 D-5).
> 실측: Windows 11 + Docker Desktop, 2026-09-28 — 결과는 README 검증 표.

## 1. 한 줄로 띄우기 (로컬 운영 모드)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- `db` (PostgreSQL 16) → `migrate` (1회성: 마이그레이션 + 샘플 시드) → `web` (Next.js `next start`, 운영 모드) 순서로 뜬다.
- 브라우저: http://localhost:3000/login — 샘플 계정 `owner@acme.test` / 비밀번호 `edim-demo-2026` (**공개 데모용 샘플 값**).
- 내리기: `docker compose -f docker-compose.prod.yml down` (데이터까지 지우려면 `down -v`).
- 운영 모드에서는 비밀번호가 없는 계정이 들어오지 못한다(`EDIM_DEV_LOGIN=0`).

개발 DB(`docker-compose.yml`, 포트 5433)와 포트가 겹치지 않게 운영 킷의 DB 는 **밖으로 열지 않는다**(web 만 3000).

## 2. 환경변수

| 이름 | 필수 | 뜻 | 킷 기본값 |
|---|---|---|---|
| `DATABASE_URL` | ✓ | 스키마 소유자 연결 — 마이그레이션·시드만 쓴다 | `postgresql://edim:…@db:5432/edim` |
| `APP_DATABASE_URL` | ✓ | 앱 연결(`edim_app` — RLS 가 실제로 걸리는 비-슈퍼유저) | `postgresql://edim_app:edim_app@db:5432/edim` |
| `PLATFORM_DATABASE_URL` | ✓ | 플랫폼 관리자 연결(`edim_platform` — DB① 만) | `postgresql://edim_platform:edim_platform@db:5432/edim` |
| `AUTH_SECRET` | ✓ | 세션 쿠키 서명 키. **없으면 로그인이 500** | compose 가 `${AUTH_SECRET:?}` 로 요구 |
| `EDIM_DEV_LOGIN` | | `1` 이면 비밀번호 없는 계정이 이메일로 들어온다(개발 편의). 설정이 없으면 `next dev` 는 1, 운영은 0 | `0` |
| `EDIM_SEED_DEMO` | | `1` 이면 migrate 단계에서 샘플 데이터(데모 회사 · 샘플 계정)를 넣는다 | `1` |
| `EDIM_OIDC_ISSUER` | | 설정되면 로그인 화면에 SSO 버튼 **자리**가 보인다(아래 5절 — 아직 연결 없음) | 비움 |

`.env` 는 이미지에 굽지 않는다(`.dockerignore`). 값은 compose 의 `environment` 나 실행 환경에서 넣는다.

## 3. 비밀값 만드는 법

```bash
openssl rand -base64 32
```

- 결과를 `AUTH_SECRET` 으로 쓴다. 킷을 띄울 때: `AUTH_SECRET=<위 값> docker compose -f docker-compose.prod.yml up -d --build`
  (Windows PowerShell: `$env:AUTH_SECRET="<값>"` 뒤 같은 명령).
- DB 역할 비밀번호(`edim_app` · `edim_platform`)는 마이그레이션이 **개발용 값**으로 만든다. 운영 DB 에서는 배포 직후
  `ALTER ROLE edim_app PASSWORD '…'; ALTER ROLE edim_platform PASSWORD '…';` 로 바꾸고 연결 문자열도 같이 바꾼다.
- 샘플 계정 비밀번호 `edim-demo-2026` 은 공개 데모용이다. 실제 회사 데이터를 넣는 환경에서는 `EDIM_SEED_DEMO=0` 으로 띄운다.

## 4. 클라우드로 옮길 때 체크리스트

- [ ] **DB 백업** — 관리형 PostgreSQL 16 의 자동 백업·시점 복구를 켠다. 옮기기 전 `pg_dump -Fc` 한 벌.
- [ ] **도메인 · HTTPS** — 앞단(로드밸런서·리버스 프록시)에서 TLS 를 끝낸다. 운영 모드 쿠키는 `secure` 라 HTTPS 에서만 붙는다.
- [ ] **연결 풀 한도** — web 한 대가 여는 연결은 운영 모드 e2e 중 최대 14~16(`pg_stat_activity` 실측, README). 인스턴스 수 × 이 값이 DB `max_connections` 를 넘지 않게 하거나 PgBouncer 를 둔다.
- [ ] **로그인 잠금 카운터** — 틀린 비밀번호 5회/10분 잠금은 **서버 메모리**에 있다. web 을 여러 대로 늘리면 공유 저장소(예: Redis)로 옮긴다.
- [ ] **DB 역할 비밀번호** 교체(3절) · `AUTH_SECRET` 은 비밀 저장소에.
- [ ] **마이그레이션은 1회성 작업**으로 — web 과 따로(킷의 `migrate` 서비스와 같은 방식). 마이그레이션은 추가만 한다(저장소 규칙).
- [ ] `db:reset:demo` 는 운영(`NODE_ENV=production`)에서 스스로 거부한다 — 그대로 둔다.

## 5. SSO 연결 자리

**아직 없음.** 로그인은 이메일 + 비밀번호(scrypt 해시 · 0032)까지다.

- 필요한 입력: **고객사 IdP 주소(issuer URL) · client id**(· client secret) — 외부 입력이라 이 저장소만으로는 만들 수 없다.
- 준비된 자리: `EDIM_OIDC_ISSUER` 가 설정되면 로그인 화면에 "회사 계정(SSO)" 버튼 자리가 보인다(눌러도 아직 아무 일도 하지 않음).
- 연결할 곳: `apps/web/app/api/auth/login/route.ts` 옆에 OIDC 콜백 경로를 두고, 콜백에서 확인된 이메일로 기존
  `authenticate()`(packages/auth) 를 부르면 회사 세션 · RLS 는 그대로 이어진다.

## 6. 필요한 것 · 첫 실행 순서 (ccmd M)

| 항목 | 값 |
|---|---|
| 도구 | Docker(Compose v2) 만. 개발 모드는 Node 20+ · pnpm 9.15.4 · Python 3.12(e2e) |
| 포트 | 운영 킷: **3000**(web)만 밖으로 · 개발: 3000(web) · **5433**(PostgreSQL) |
| 디스크 | 이미지 빌드 캐시 포함 약 3 GB(이미지 web · migrate · postgres:16-alpine) + DB 볼륨(샘플 데이터 수십 MB) |
| 메모리 | 빌드 중 2 GB 이상 권장(Next.js 빌드) · 실행은 web 1대 수백 MB |

첫 실행:

1. `openssl rand -base64 32` 로 비밀값을 만든다(3절).
2. `AUTH_SECRET=<값> docker compose -f docker-compose.prod.yml up -d --build` — `db` 가 healthy → `migrate` 가 끝나야(`Exited (0)`) → `web` 이 뜬다.
3. `docker compose -f docker-compose.prod.yml ps` 로 web 이 `Up` 인지 본다 → http://localhost:3000/login.
4. 확인이 끝나면 `docker compose -f docker-compose.prod.yml down`.

## 7. AI 키가 없을 때 — 결정론 폴백 (D-6)

**AI 키가 없어도 모든 화면이 돈다. 실패가 아니다.** 실행 경로에는 처음부터 LLM 이 없다(런타임 LLM 호출 0).

| 자리 | 키가 없을 때 |
|---|---|
| 매크로 실행(EDIM Run) · BOM · 원가 · 견적 · 도면 | 원래 결정론 — 승인된 식만 실행 |
| Prompt → Macro(자연어 번역 · `ANTHROPIC_API_KEY`) | 번역 버튼이 "번역 모델이 연결되지 않았습니다 … Macro 칸에 직접 입력하면 검증·역번역·승인·실행은 그대로 동작합니다" 를 돌려준다 |
| UI 개발 AI(p25) | **결정론 설계기**가 UI Templet 대화 상자(용도 · 항목 · 필요 DB Table) + 설명 낱말로 폼을 설계한다 — 화면에 "결정론 설계기 — AI 키 없음" 표기 |
| 학습 AI(플랫폼) | 공식 탐구 · 검증은 결정론 · 이름 맞추기 · 설명은 로컬 AI(`EDIM_LOCAL_AI_URL`)가 있으면 쓰고 없으면 사전(결정론) |

## 8. 흔한 실패 3가지

| 증상 | 원인 | 대처 |
|---|---|---|
| 킷은 뜨는데 화면 숫자 · 개정 · 시연 순서가 문서와 다르다(e2e 가 중간부터 실패) | 예전 킷 볼륨(`edim-prod-pgdata`)에 이전 실행의 데이터가 남아 있다(CP3 실측) | 샘플 데이터뿐이면 `docker compose -f docker-compose.prod.yml down -v` 로 볼륨을 지우고 다시 `up -d --build`(**되돌릴 수 없다** — 실데이터가 있으면 먼저 `pg_dump`) |
| 로그인하면 500 | `AUTH_SECRET` 이 비었다 | 3절대로 값을 넣고 다시 띄운다(compose 가 없으면 시작을 거부한다) |
| 화면이 빈 BOM · 도면 422 | ① 개발 DB 에 시드가 없다 ② 설계 검증 위반(정상 동작) | ① `pnpm db:reset:demo` ② 422 메시지의 규칙 · 치수를 고치고 BOM Run 을 다시 |

## 9. 회사 실자료로 바꾸기 — 파일만 교체 (완료 정의 4)

코드는 고치지 않는다. 샘플 파일 자리에 **회사 파일**을 두면 그것을 읽는다(회사 파일은 `.gitignore` — 저장소에 올라가지 않는다).

| 무엇 | 샘플(저장소) | 회사 파일 자리 · 환경변수 | 언제 반영 |
|---|---|---|---|
| 카탈로그 — Sub Code · Product Code · 표(치수 · 기술 · 규칙 · 세부 치수) · 코드 관계 · 관계 단가 | `packages/bom-code/catalog/ahu-demo.json` | `packages/bom-code/catalog/catalog.local.json` · `EDIM_CATALOG` | `pnpm db:reset:demo`(개발) · 운영 킷은 `up -d --build`(migrate 가 시드) |
| CAD 규칙서 — 3×3 칸 → mm · 기준점 · 구동 방식 · 방향 결합 · KAD 대응표 | `packages/bom-code/cad-rules/cad-rules.sample.json` | `cad-rules.local.json` · `EDIM_CAD_RULES` | 다음 BOM Run 부터(앞 스냅샷 도면은 그대로) |
| PCR 요율표 — Business Type 열 · 요율 | `packages/bom-code/cost-rules/pcr-rules.sample.json` | `pcr-rules.local.json` · `EDIM_PCR_RULES` | 다음 견적부터(앞 견적은 그대로) |

- 운영 킷(docker)에서는 이미지 빌드 때 저장소의 파일이 들어간다 — 회사 파일을 같은 자리에 두고 `up -d --build`, 또는 파일을 볼륨으로 붙이고 환경변수(`EDIM_CAD_RULES` · `EDIM_PCR_RULES`)로 가리킨다.
- 틀린 파일은 조용히 무시하지 않는다: CAD 규칙서 · PCR 요율표가 틀리면 BOM Run · 견적이 422 로 이유를 돌려준다.
- 단가 이력 · 제조 정보 표 · 회사 정보는 화면(Set-Up)에서 쌓는 데이터라 파일 교체 대상이 아니다.
