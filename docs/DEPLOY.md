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
