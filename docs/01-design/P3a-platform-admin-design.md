# P3-a 설계안 — 플랫폼 관리자 계층 + DB①/DB② 소유 분리 · 역류 차단

> **구현됨 · 점검 초안** · 설계 2026-09-19 승인 → 같은 날 브랜치 `feat/p3a-platform-admin`에 구현. 마이그레이션 `0007_platform`.
> 검증 실측: `platform:test` **21/21** · e2e **51/51**(P3-a 12단계 추가) · typecheck 11 · 테스트 169 불변 · rls·revision·backbone 회귀 PASS.
> 근거: 확정 장부(3계층 권한 · DB①/DB② · 역류 금지 · "toolbox와 Special은 UI 커스터마이징만 공유"), EDIM.pdf p54("AI 학습은 Platform 제공자만 작업 가능" · "※ System DB에 영향을 주는 것은 Platform 승인을 득해야 함" · "편집: 각 사용자의 권한을 받은 항목만 표시" · "2. User Management"), p59("최종 관리자 승인 관리 필요"), p64(Admin. · Employee · Partner).
> 범위 결정(회장님 2026-09-19): **구조만 만들고 내용물은 비운다.** 학습·프로젝션(P3-b)은 DXF 연구 결과 후, Special 슬롯(P3-c)은 D1 후.

## 1. 지금 상태 (repo 실측, main f2b4277)
- 역할은 **테넌트 안 5종**뿐(`owner·engineer·cad·sales·viewer`, core-ontology `ROLES`). 테넌트 **밖**의 주체가 없다 → 3계층 중 1층(플랫폼 관리자)이 통째로 없음.
- DB 접속 주체 2개: `adminPrisma`(스키마 소유자, RLS 우회 — 로그인 해석·시드 전용) · `appPrisma`(`edim_app`, RLS 강제). 모든 테이블이 `public` 한 스키마.
- 회사 관리자(owner)가 하부 사용자를 통제하는 화면·API 없음(멤버십 관리 0) → 2층→3층 통제도 미구현.
- DB①에 해당하는 저장소·접속 주체 없음. 따라서 "역류 금지"를 **강제하는 장치도 없음**(지금은 DB①이 없어서 안 일어날 뿐).

## 2. 원자 단위로 나눈 문제
| # | 질문 | 설계 답 |
|---|---|---|
| a | 플랫폼 관리자는 **어디에 속하나** | 테넌트 밖. 멤버십이 아니라 별도 등록(`platform.admin_user`). 테넌트 역할 5종은 그대로 |
| b | 플랫폼 관리자가 **고객사 데이터를 볼 수 있나** | **기본은 못 본다.** RLS 우회 권한을 주지 않는다. 볼 수 있는 것: 테넌트 목록(이름·가입일·인원수)과 **요청 통로**에 올라온 것뿐 |
| c | DB①과 DB②를 **무엇으로 가르나** | Postgres **스키마 + DB 역할**. `public` = DB②(지금 그대로), `platform` = DB①(신설). 코드 규약이 아니라 **DB 권한**으로 가른다 |
| d | **역류 차단**을 무엇으로 보장하나 | 접속 역할 2개의 권한 교차 부재: `edim_app`은 `platform`에 USAGE조차 없음 / `edim_platform`은 `public`의 업무 테이블에 SELECT 없음. 앱 코드에 버그가 있어도 DB가 거부 |
| e | DB①→DB②(허용 방향)는 어디로 들어오나 | P3-b에서 **착지 테이블 1곳**에 INSERT만(모양은 DXF 연구 결과로 결정). P3-a에서는 만들지 않는다 |
| f | 테넌트→플랫폼으로 올라가는 **정당한 통로**는 | `public.platform_request` **한 곳**(승인 요청·Special 의뢰). 업무 데이터가 아니라 "요청서". 플랫폼 역할은 이 테이블만 읽고 결정만 쓴다 |
| g | 2층→3층 | owner가 자기 테넌트의 멤버 목록을 보고 역할을 바꾼다(p54 User Management). 마지막 owner 강등 금지 · 감사 기록 |

## 3. 구조 (제안)
```
                ┌──────────── platform 스키마 = DB① (관리자 소유) ────────────┐
 platform 로그인 │ admin_user · learning_source(빈 골격) · (P3-b: 패턴·프로젝션 기록) │
   /platform    └───────────────▲──────────────────────────┬──────────────────┘
        │          edim_platform 역할만 접근                 │ P3-b: 착지 1곳에 INSERT만 (허용 방향)
        │                                                   ▼
        │        ┌──────────── public 스키마 = DB② (회사별 RLS) ────────────────┐
        └─읽기──▶│ platform_request  ◀─쓰기── 회사 관리자(owner)                  │
          결정   │ tenant·membership·hierarchy·project·macro·catalog·bom_code_run │
                 └─ edim_app 역할(RLS 강제) · platform 스키마 접근 불가 ───────────┘
```
- **마이그레이션 0007 (추가만, 기존 테이블 무변경)**: `CREATE SCHEMA platform` · 역할 `edim_platform` · `platform.admin_user(user_id → app_user)` · `platform.learning_source`(id·kind·title·note·created_at — 내용 없음, 권한 검증용 골격) · `public.platform_request`(tenant_id·kind·subject·payload·state requested/approved/rejected·requested_by·decided_by·decided_at·note, RLS).
- **권한**: `edim_app` → `platform` 스키마 권한 없음 · `platform_request`에 SELECT/INSERT(자기 테넌트, RLS)만, 결정 컬럼 UPDATE 불가. `edim_platform` → `platform` 전체 · `public.tenant`(SELECT) · `public.platform_request`(SELECT + 결정 컬럼 UPDATE) · **그 외 public 테이블 권한 없음**.
- **접속 주체 3개**: `adminPrisma`(기존, 로그인 해석·시드) · `appPrisma`(기존) · **`platformDb`(신규, `PLATFORM_DATABASE_URL`)**. platform 스키마는 Prisma multiSchema를 쓰지 않고 작은 SQL 모듈로 다룬다(테이블 2~3개 — Prisma 설정 변경 위험을 지지 않는다).
- **세션**: 테넌트 세션은 그대로. 별도 `getPlatformSession()` — 같은 로그인, `platform.admin_user`에 있으면 성립. 플랫폼 전용 사용자는 멤버십이 없어도 `/platform`만 접근 가능. 시연용으로 `platform@edim.test`를 **별도 계정**으로 시드(회사 owner와 다른 사람임이 화면에서 보이게).
- **화면**: `/platform`(테넌트 목록 · 요청 대기열 · DB① 상태 = "비어 있음") / 회사 쪽 `/m/company`에 User Management(멤버·역할 변경, owner 전용).

## 4. 검증 계획 (DoD)
1. `platform:test`(DB 스크립트): `edim_app`으로 `platform.learning_source` SELECT → **permission denied** · `edim_platform`으로 `public.product_code`/`bom_code_run`/`project` SELECT → **permission denied** · `edim_platform`은 `platform_request` 조회·결정 가능 · 테넌트 A는 B의 요청을 못 봄(RLS) · `edim_app`은 요청의 state를 직접 못 바꿈.
2. e2e 추가: 플랫폼 계정 로그인 → `/platform` 테넌트 2곳 보임 · 회사 owner가 요청 1건 올림 → 플랫폼이 승인 → 회사 화면에 '승인됨' · viewer/owner는 `/platform` 403 · 플랫폼 계정은 `/workbench` 접근 불가 · owner가 viewer를 engineer로 올리면 그 계정에 등록 버튼이 생김 · 마지막 owner 강등은 거부.
3. 기존 39단계 · 테스트 169 · DB 검증 3종 불변.

## 5-0. 회장님 결정 (2026-09-19) — **설계 승인, 구현은 다음 세션**
- **Q1 = 좁게.** 플랫폼 승인 대상은 플랫폼 소유 구조·Special 의뢰뿐. 회사가 자기 코드·표·관계·Macro를 고치는 것은 회사 관리자 선에서 끝난다(셀프서비스). → P3-a 요청 통로의 첫 종류 = "Special 의뢰/문의".
- **Q2 = 나중에.** 플랫폼 관리자의 고객사 업무 데이터 열람 길은 P3-a에 두지 않는다(기본 차단). 컨설팅 BM용 '동의한 집계 뷰'는 별도 설계.
- **Q3 = 포함.** 회사 쪽 User Management(멤버·역할 변경, owner 전용)를 P3-a에 넣는다.

## 5. (기록) 결정을 요청했던 내용
- **Q1. "System DB에 영향을 주는 것"의 범위.** p54 문장을 어떻게 읽을지에 따라 요청 통로에 **무엇이 올라오는지**가 갈립니다.
  - (가) **좁게** — 플랫폼이 소유한 구조(새 Form·새 DB 구성·Special 의뢰)만. 회사가 자기 코드·표·관계·Macro를 고치는 것은 회사 관리자 승인으로 끝(셀프서비스 BM과 맞음). → P3-a에서 대기열에 실제로 올라오는 것은 "Special 의뢰/문의" 1종.
  - (나) **넓게** — 회사 카탈로그의 **구조 변경**(Product Code 신규·삭제, 표 열 추가, 관계 추가·삭제)도 플랫폼 승인. 값 수정(표 칸·Sub Item 추가)은 즉시. → 통제는 강해지나 "직접 만들어라" 모델과 부딪히고 고객사가 느려짐.
  - **엘 권고 = (가).** 근거: 확정 장부의 셀프서비스 모델 · p54 목록(Hierarchy·Form·DB 구성·Macro·Form 호출)은 회사가 하는 일로 적혀 있고 승인 문구는 그중 "System DB에 영향"인 것에만 붙음. 다만 청사진 원작자의 의도는 제가 확정할 수 없습니다.
- **Q2. 플랫폼 관리자가 고객사 업무 데이터를 열람하는 길을 P3-a에 둘 것인가.** 엘 권고 = **두지 않는다**(기본 차단). 컨설팅 BM(내부 최적화·익명 벤치마킹)은 나중에 "회사가 동의한 집계 뷰"로 별도 설계 — 그때도 학습 DB로의 역류 금지는 그대로.
- **Q3. 회사 쪽 User Management를 P3-a에 포함할 것인가.** 엘 권고 = **포함**(작음 · 3계층이 화면에서 다 보이려면 필요).

## 5-1. 구현에서 설계와 달라진 것 (회장님 확인 요청)
- **테넌트 목록의 '인원수'를 뺐다.** §2b는 인원수까지 보여준다고 썼는데, §3 권한표에는 `membership` SELECT가 없다(내부 불일치). 인원수를 넣으려면 업무 테이블에 RLS 예외를 하나 뚫어야 해서, **§3(좁은 권한)을 택하고 '요청 건수'로 대체**했다. `platform:test`는 `membership`도 permission denied 임을 실측한다. 넓히려면 말씀만 주시면 된다.
- **요청 통로에서 회사 역할의 UPDATE를 전부 회수**했다(설계는 "결정 컬럼 UPDATE 불가"). 회사가 올린 요청을 취소·수정하는 기능이 P3-a 범위에 없어서, 더 좁은 쪽으로 갔다.
- `reset:demo`에 요청 행·역할 변경 원복을 추가했다(리허설 잔재 규칙의 연장).

## 6. 위험과 되돌리기
- 위험: DB 역할이 하나 늘어 로컬 실행 절차에 `.env` 한 줄(`PLATFORM_DATABASE_URL`)이 추가됨 → DEMO.md·`.env.example` 갱신 필수(회장님 Windows 실행 0회 상태라 절차가 늘어나는 것은 비용).
- 되돌리기: 0007은 추가만 하므로 `DROP SCHEMA platform CASCADE; DROP TABLE platform_request; DROP ROLE edim_platform;`으로 원복. 기존 테이블·RLS 정책은 손대지 않음.
- 하지 않는 것: 학습 파이프라인 · 프로젝션 · 유사도 · Special 슬롯 · 과금 · 컨설팅 뷰 · 플랫폼의 테넌트 생성/정지.
