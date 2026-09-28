# 🏭 EDIM — 제품 코드 한 줄로 BOM · 도면 · 원가 · 견적 · 구매까지

> **주문생산(Configure-to-Order) 제조사를 위한 CPQ + PLM + ERP 통합 플랫폼**
> TypeScript · Next.js 15 · PostgreSQL 16(RLS) · Prisma · pnpm 모노레포 · 결정론 매크로 DSL · 학습 AI(진행 중)

[![CI](https://github.com/parksubeom99/EDIM/actions/workflows/ci.yml/badge.svg)](https://github.com/parksubeom99/EDIM/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20RLS-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![e2e](https://img.shields.io/badge/e2e-334%2F334%20dev%20%C2%B7%20prod-0e7c6b)
![unit](https://img.shields.io/badge/unit-270-0e7c6b)
![DB checks](https://img.shields.io/badge/DB%20checks-9%20suites-0e7c6b)

---

## 📌 한 줄 요약 (면접 답변용)

> "공조기처럼 주문마다 사양이 바뀌는 제품에서 **도면 · BOM · 원가 · 견적이 서로 어긋나는 문제**를,
> 제품 규칙을 코드로 한 번 등록하면 모든 산출물이 **불변 BOM 스냅샷 한 장**에서 나오도록 설계해 풀었습니다.
> 회사 격리 · 개정 이력 · 발행 잠금은 애플리케이션 `if` 가 아니라 **PostgreSQL RLS · 트리거 · 권한**이 강제하고,
> AI 는 **빌드 타임 번역기**로만 쓰고 런타임은 결정론으로 묶어 **환각이 견적에 들어갈 경로를 구조적으로 없앴습니다.**"

---

## 🎯 프로젝트 목적

| 항목 | 내용 |
|---|---|
| 문제 | 주문생산 공장에서 사양 하나가 바뀌면 설계자가 도면 · BOM · 원가 · 견적을 **손으로 네 번** 다시 만든다 → 숫자가 어긋나고, 어느 견적이 어느 도면에서 나왔는지 역추적이 안 된다 |
| 해법 | 제품 코드(RCCS: `EU-25-2123-630-SS-1-21-13-15`)에 사양을 함축 → 등록된 코드 관계를 따라 BOM 산출 → 모든 산출물은 **같은 스냅샷**을 읽는다 |
| 대상 사용자 | 공조기(AHU) 등 CTO 제조사의 설계 · 견적 · 구매 담당, 그리고 회사 관리자(셀프서비스로 규칙을 직접 고침) |
| 핵심 증명 | ① 산출물 간 **정합성**(견적 합계 = 원가 = Word · Excel 값) ② **멀티테넌트 격리를 DB 가 강제** ③ **AI 를 쓰되 런타임은 결정론** |
| 근거 자료 | 파트너사 설계 청사진 70쪽 · 설계 코퍼스 85편 → 쪽마다 구현 여부를 대조표로 추적([`page-map.md`](docs/00-corpus/page-map.md)) |

---

## 🏗️ 아키텍처

![EDIM 전체 구조](docs/architecture/edim-big-picture.svg)

- **관리자 영역(DB①)과 사용자 영역(DB②)은 DB 역할(role)로 갈라져 있다.** 플랫폼 계정은 회사 업무 테이블을 **읽을 권한 자체가 없고**, 회사 계정은 플랫폼 스키마에 접근할 수 없다. 두 영역 사이 정당한 통로는 "Special 의뢰서" 한 곳과 "승인된 학습 결과의 단방향 투영" 한 곳뿐이다.
- **사용자 영역은 한 방향으로 흐른다**: 코드 · 관계 셋업(PLM) → BOM Run(스냅샷) → 원가 · 도면 · 견적 · Tech Data(CPQ) → 구매 요청 · 발주(ERP).
- 영역별 심화: [`docs/architecture/README.md`](docs/architecture/README.md) · AI 설계: [`docs/ai/README.md`](docs/ai/README.md)

```text
[Browser] ── Next.js 15 App Router (화면 + API Route)
                │  세션 쿠키(HMAC) → 회사 결정 → RBAC(owner · engineer · cad · sales · viewer)
                ▼
        packages/auth ── packages/db (Prisma · 역할별 연결 3개)
                │            edim_app      : 회사 업무 (RLS FORCE — 자기 회사 행만)
                │            edim_platform : 플랫폼 스키마만 (회사 업무 테이블 권한 0)
                │            admin         : 마이그레이션 · 시드 전용
                ▼
     PostgreSQL 16 ── 마이그레이션 0001~0032 · RLS · append-only 권한 · 발행/발주 잠금 트리거

순수 엔진(부작용 없음 · DB 모름): bom-code · macro-dsl · macro-verify · macro-compile · hierarchy-address
```

---

## 🤖 AI 설계 — "LLM 은 컴파일러다"

제조 견적에서 AI 환각은 **돈이 틀리는 사고**다. 그래서 EDIM 은 AI 를 **어디에 두고 어디서 빼는지**부터 설계했다.

```text
 BUILD-TIME (느린 시계 · 사람 + AI)                           RUN-TIME (빠른 시계 · AI 0)
 ─────────────────────────────────────────────                ─────────────────────────────
 전문가 자연어 ─▶ [번역기: LLM 자리 · provider 교체형]
                    │  출력은 Macro DSL 한 가지뿐
                    ▼
               [검증기] 파스 · 주소 · 타입 · 순환 + dry-run
                    ▼
               [역번역] DSL → 흐름도 · 한국어 설명 (LLM 없이, 결정론)
                    ▼
               [승인 관문] 초안 → 검토 → 승인  ── 승인본만 ──▶ [결정론 실행기] ─▶ BOM · 원가 · 도면
                    ▲                                              같은 입력 = 같은 답 · 재현 100%
               승인 코퍼스가 다음 번역의 예제로 재유입
```

| 구성 | 패키지 | 단위 테스트 | 하는 일 |
|---|---|---|---|
| Macro DSL | `packages/macro-dsl` | 54 | 토크나이저 · 파서 · 결정론 실행기(IF · Table · Var · SUM · LOOKUP …) |
| 검증기 | `packages/macro-verify` | 19 | 정적 검사(주소 · 타입 · 순환) + 시험 실행 |
| 번역 루프 · 역번역 | `packages/macro-compile` | 13 | 문법 명세 프롬프트 → 후보 → **검증기 진단을 LLM 에 되먹여 재시도** · 식 → 흐름도 · 설명(LLM 없이) |
| 등록부 | `packages/macro-registry` | 15 | 초안 → 승인 → 개정 규칙 (승인 전 초안은 개정 번호를 먹지 않음) |

> 번역 루프는 LLM 을 **주입된 인터페이스**로만 부른다. 테스트는 대본 클라이언트를 주입해 "모델이 같은 실수를 반복할 때"까지 네트워크 없이 재현한다. 검증 안 된 후보도 숨기지 않고 진단과 함께 돌려주되, 승인 단계는 `verified === true` 만 받는다. → [`docs/ai/README.md`](docs/ai/README.md)

**학습 AI 1수준 (구현 진행 중 · 설계 [`docs/ai/learning-ai.md`](docs/ai/learning-ai.md))**
- 회사 도면(DXF)에서 치수를 **발췌** → 이름 · 단위를 EDIM 형식으로 **정렬화** → 치수 사이의 **공식 탐구**(예: 전장 = Σ 구획 길이) → 검증 → **사람 승인 = 정답 라벨** → 승인분만 회사 DB 로 **단방향 투영**.
- 에이전트 하네스 구조: 도구마다 `validate → authorize → run` 수명주기, 읽기 전용 도구는 자동 · 쓰기 도구는 승인 관문, 계획 먼저 · 단계 상태 영속화 · 단계별 비용 기록.
- 평가지표는 정확도가 아니라 **업무 영향 기준**: 제작 공차 1 mm · 어긋난 도면 5 % 이하 · 근거 도면 10장 이상.

**AI 로 개발하는 방식 자체도 설계했다** → [`docs/ai/agentic-development.md`](docs/ai/agentic-development.md)
설계 · 검증 AI 와 구현 에이전트(Claude Code)를 분업시키고, 인계서 · 회수서 · **머지 게이트(typecheck · 단위 · DB 검증 · 개발/운영 모드 e2e)** · **독립 재측정**으로 에이전트 산출물을 판정한다. 이 과정에서 실제 결함 여러 건을 에이전트 보고가 아니라 재측정으로 잡았다.

---

## ⚡ 핵심 기술 선택 근거 (면접 질문: "왜 이렇게 만들었나")

### 1. BOM 을 테이블이 아니라 **코드 관계에서 산출** — 왜 BOM 을 저장하지 않나

**문제:** 사양 조합이 수만 가지라 BOM 을 조합마다 저장하면 규칙이 바뀔 때 전부 틀린다.
**선택:** 회사가 등록하는 것은 **Sub 코드 · Product 코드 · 코드 관계 · 표 · 승인된 매크로**뿐. BOM 은 `BOM Run` 이 그 규칙을 따라 계산하고, 결과는 **불변 스냅샷**(`bom_code_run`)으로 남긴다.
**트레이드오프:** 저장된 BOM 을 직접 고치는 편의는 포기 → 대신 "이 BOM 은 어느 규칙 · 어느 개정에서 나왔나"가 항상 추적된다(스냅샷에 카탈로그 지문 · 매크로 id · 개정 번호가 박힘).
→ [ADR-001](docs/adr/ADR-001-code-driven-bom.md)

### 2. 모든 산출물은 **스냅샷만 읽는다** — 정합성을 구조로

**문제:** 원가 화면 · 견적서 · 구매 요청이 각자 다시 계산하면, 그 사이 단가가 바뀌는 순간 숫자가 갈라진다.
**선택:** 원가 · 도면 · 견적 · Tech Data · 구매 요청은 **재계산하지 않고 `runId` 스냅샷을 읽는다.** 승인 · 발행 · 발주는 스냅샷 한 장에 묶이고, 발행된 문서와 발주된 구매는 **DB 트리거가** 수정 · 삭제를 거부한다.
**검증:** e2e 가 "견적 합계 = 원가 카드 = Word · Excel 파일의 값"을 파일을 직접 열어 단언. 단가를 바꾼 뒤 다시 Run 하지 않으면 옛 견적은 그대로임을 단언.
→ [ADR-003](docs/adr/ADR-003-immutable-snapshot.md)

### 3. 멀티테넌트 격리를 **PostgreSQL RLS + FORCE** 로 — 왜 애플리케이션 필터가 아닌가

**문제:** `WHERE tenant_id = ?` 를 한 곳이라도 빠뜨리면 다른 회사 데이터가 샌다. 코드 리뷰로는 0 을 보장할 수 없다.
**선택:** 모든 업무 테이블 `ENABLE + FORCE ROW LEVEL SECURITY` · 앱은 `edim_app` 역할로만 접속 · 요청마다 트랜잭션 안에서 `set_config('app.current_tenant')`.
**트레이드오프:** 쿼리마다 트랜잭션 래핑 비용 · 마이그레이션이 까다로움 ↔ 누락이 있어도 **DB 가 0건을 돌려준다.** 새 API 마다 "다른 회사 404/0건" e2e 단언을 의무로 둔다.
→ [ADR-004](docs/adr/ADR-004-rls-tenant-isolation.md)

### 4. 관리자/사용자 영역 분리를 **DB 역할 권한**으로 — 역류 차단

**문제:** 플랫폼(학습 AI)은 데이터가 많을수록 좋지만, 고객사 업무 데이터가 플랫폼으로 흘러가면 데이터 주권 · 신뢰가 깨진다.
**선택:** `platform` 스키마 + `edim_platform` 역할. 플랫폼은 회사 업무 테이블에 **GRANT 가 없다.** 회사 → 플랫폼 통로는 요청서 테이블 하나, 플랫폼 → 회사 통로는 승인된 결과만 넣는 `SECURITY DEFINER` 함수 하나.
**검증:** `platform:test` 가 "플랫폼 역할로 회사 테이블 SELECT → permission denied"를 매 CI 에서 확인.
→ [ADR-005](docs/adr/ADR-005-admin-user-db-separation.md)

### 5. **결정론 런타임** — AI 를 쓰면서 환각을 0 으로

**문제:** 도메인 전문가(비개발자)가 엑셀 매크로 수준의 계산을 직접 만들고 싶어 한다. LLM 이 돕기 좋지만, 런타임에 LLM 이 답을 만들면 같은 입력에 다른 견적이 나올 수 있다.
**선택:** LLM 은 **자연어 → DSL 번역**에만(빌드 타임 · 1회). 실행은 검증 · 승인된 DSL 만, 결정론 실행기로. 역번역(DSL → 흐름도 · 설명)은 LLM 없이 해서, 사람이 AI 산출물을 **읽고 승인**할 수 있게 했다.
**트레이드오프:** DSL 표현력 한계(엑셀 코어 함수 + 관측 함수 v1) ↔ 비용 0 · 지연 0 · 재현 100 %. DSL 로 안 되는 계산은 Special Tool Box(별도 과금)로.
→ [ADR-002](docs/adr/ADR-002-deterministic-runtime.md)

### 6. 검증을 **운영 모드 e2e** 까지 머지 게이트에 — 왜 개발 모드만으론 부족했나

**문제:** 개발 모드에서 287단계가 모두 통과하던 앱이, 운영 빌드(`next build → start`)에서는 **HTTP 500 (too many clients)** 으로 무너졌다.
**원인:** DB 클라이언트 래퍼가 운영 모드에서만 캐시를 건너뛰고 **속성 접근마다 PrismaClient 를 새로** 만들어 요청마다 연결 풀이 생겼다.
**선택:** 클라이언트는 항상 1개로 캐시 + 머지 게이트를 "개발 모드 e2e + **운영 모드 e2e** + 운영 중 `pg_stat_activity` 기록"으로 상향. 현재 운영 모드 동시 연결 14~15.
→ [ADR-008](docs/adr/ADR-008-production-mode-gate.md) · [트러블슈팅 T-01](docs/troubleshooting.md#t-01)

---

## 📊 전체 업무 플로우

```text
① 회사 관리자: Sub 코드 · Product 코드 · 코드 관계 · 표 · 치수 표 등록 (셀프서비스)
        │     코드 개정은 append-only (Rev A → B, 이력 수정 불가 — 앱 역할에 UPDATE/DELETE 권한 없음)
        ▼
② MainForm: 코드 조립 A▼ B▼ C▼ D▼ E▼ F▼  →  EU-25-2123-630-SS-1-21-13-15
        │     설계 검증: 규칙 표 + 승인된 매크로 (위반이면 도면 발행 422)
        ▼
③ BOM Run  ──▶  스냅샷(runId) = BOM 11행 · 치수 · 카탈로그 지문 · 매크로 id · 단가 출처
        │
        ├──▶ 원가 (재료비 · 인건비 · 경비 — 단가 이력에서 기준일 유효 단가)
        ├──▶ 도면 DXF (평면 · 정면 · 측면 · 조립도 · 3각법 · 3D 등각) — 치수 표 한 칸이 도면 폭을 바꾼다
        ├──▶ 견적서 · Tech Data (인쇄본 · Word · Excel) — 발행되면 잠금
        └──▶ 구매 요청 → 견적 요청 → 발주 — 발주되면 잠금
        ▼
④ 승인 대장: 승인 · 발행 · 발주가 전부 같은 스냅샷을 가리킨다 (추적 화면에서 역으로 따라감)
```

---

## 🖼️ 화면 (e2e 가 매번 새로 찍는 실제 화면)

| 작업대 — 청사진의 다섯 구역 | 코드 조립 · 개정 Rev A→B | BOM Run → EBOM → Cost |
|---|---|---|
| ![작업대](docs/screens/10_project_bound.webp) | ![코드](docs/screens/11b_revisions.webp) | ![BOM](docs/screens/15_bom_cost.webp) |

| 매크로 — 검증 → 초안 → 승인 | Toolbox — 식을 말로, 흐름도로 (LLM 없이) | Set-Up — 코드 관계가 곧 BOM |
|---|---|---|
| ![매크로](docs/screens/13_macro_approved.webp) | ![Toolbox](docs/screens/30_toolbox_program.webp) | ![관계](docs/screens/22_setup_relationship.webp) |

| 도면 — 등록 치수 표에서 나온다 | 견적 · Tech Data · 구매 요청 | 구매 요청 → 견적 요청 → 발주 |
|---|---|---|
| ![도면](docs/screens/43_drawings.webp) | ![문서](docs/screens/44_document_tab.webp) | ![구매](docs/screens/45_purchasing.webp) |

| 견적서 인쇄본 — 합계 = 스냅샷 원가 (Word · Excel 로도) | 설계 검증 — 승인된 매크로가 규칙이 된다 | 플랫폼 콘솔 — 고객사 업무 데이터는 없다 |
|---|---|---|
| ![견적서](docs/screens/46_quotation_print.webp) | ![설계 검증](docs/screens/80_macro_verify.webp) | ![플랫폼](docs/screens/41_platform_console.webp) |

전체 57장: [`docs/screens/`](docs/screens) · `scripts/demo_e2e.py` 가 334단계를 걸으며 캡처한다(목업 아님).

---

## 🛠️ 기술 스택

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 언어 · 구조 | TypeScript 5 · pnpm 모노레포 (패키지 11) | 순수 엔진(DB 모름)과 어댑터(DB · 화면)를 패키지 경계로 분리 |
| 웹 | Next.js 15 App Router (화면 + API Route) | 단일 배포 단위 · 서버 컴포넌트에서 세션 · 회사 결정 |
| DB | PostgreSQL 16 · Prisma 6 · 마이그레이션 32개(추가만) | RLS · 트리거 · 역할 권한으로 규칙을 DB 에 못 박기 |
| 인증 | HMAC 서명 세션 쿠키 · scrypt 비밀번호(Node 내장) · RBAC | 외부 의존 0 · SSO 는 고객 IdP 자리만 |
| 도면 | DXF R12 생성 · 3각법 · 3D 등각(three.js) | 외부 CAD 없이 치수 표 → 도면 |
| 문서 | 인쇄본 HTML · Word(docx) · Excel(exceljs) | 숫자를 표시 문자열이 아니라 **값**으로 (엑셀 합계가 되게) |
| 테스트 | vitest(단위 270) · DB 검증 스크립트 9종 · Playwright(Python) e2e 334단계 | 화면 + API + DXF · Office 파일 파싱까지 한 시나리오 |
| CI · 배포 | GitHub Actions · Dockerfile(다단계) · docker compose 운영 킷 | 로컬 한 줄로 운영 모드 재현 |

---

## 🚀 로컬 실행

Docker 만 있으면 된다.

```bash
AUTH_SECRET=$(openssl rand -base64 32) docker compose -f docker-compose.prod.yml up -d --build
# → http://localhost:3000/login
```

**샘플 계정**(공개 데모용 · 실제 계정 아님), 비밀번호는 모두 `edim-demo-2026`

| 이메일 | 역할 | 확인할 것 |
|---|---|---|
| `owner@acme.test` | 데모 회사 A 관리자 | 모든 화면 · 매크로 승인 · 발행 |
| `viewer@acme.test` | 데모 회사 A 열람자 | 고치기 · 내보내기 → 403 |
| `owner@globex.test` | 데모 회사 B | A 의 데이터가 **하나도** 안 보임 |
| `platform@edim.test` | 플랫폼 관리자 | 고객사 업무 데이터 권한 없음 |

<details><summary>개발 모드 (pnpm)</summary>

```bash
docker compose up -d                      # PostgreSQL 16 (포트 5433)
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:generate && pnpm db:migrate
pnpm db:seed && pnpm db:seed:demo
pnpm dev                                  # http://localhost:3000
```
</details>

환경변수 · 클라우드로 옮길 때: [`docs/DEPLOY.md`](docs/DEPLOY.md) · 시연 절차: [`docs/DEMO.md`](docs/DEMO.md)

---

## 🧪 테스트 현황

| 층 | 대상 | 수 | 무엇을 못 박는가 |
|---|---|---|---|
| 단위 | `bom-code` | 33 | 코드 관계 → BOM 산출 · 설계 검증 규칙(표 · 매크로) |
| 단위 | `macro-dsl` | 54 | 파서 · 실행기 · 함수 의미 · 오류 경로 |
| 단위 | `macro-verify` · `macro-compile` · `macro-registry` | 19 · 13 · 15 | 정적 검사 · 시험 실행 · 역번역 · 승인/개정 규칙 |
| 단위 | `hierarchy-address` | 18 | Work Hierarchy 주소 해석 |
| 단위 | `apps/web` | 118 | 단가 기준일 · 인쇄 양식 · Office 내보내기 · 배치 · 비밀번호 등 |
| 단위 | `auth` | 2 묶음 | scrypt 해시(잘린 해시 거부 포함) · 회사 결정 |
| DB | `rls` · `platform` | 9종 중 2 | 회사 격리 · 플랫폼 역할은 회사 테이블 권한 0 |
| DB | `revision` · `macro` | 9종 중 2 | 코드 개정 append-only(앱 역할에 UPDATE/DELETE 권한 없음) · 매크로 승인 · 개정 번호 규칙 |
| DB | `drawing` · `document` · `project` · `backbone` · `hierarchy` | 9종 중 5 | 발행 · 발주 잠금이 **앱을 우회해도** 걸린다 · 스냅샷 참조 무결성 |
| e2e | `scripts/demo_e2e.py` | **334단계** | 화면 + API + DXF(ezdxf) · Word/Excel(python-docx · openpyxl) 파싱 · 새 API 마다 열람자 403 · 타사 404 |

**머지 게이트**(모든 기능 브랜치): typecheck 11 패키지 → 단위 전부 → DB 초기화 후 DB 검증 9종 → e2e **개발 모드 1회 + 운영 모드 1회**(운영 중 `pg_stat_activity` 기록) → fast-forward 머지 → 머지된 main 에서 한 번 더.
**CI**: GitHub Actions — typecheck · 단위 · DB 검증 9종 (위 배지).

---

## 🔑 주요 설계 결정 (ADR)

| ADR | 결정 | 한 줄 근거 |
|---|---|---|
| [001](docs/adr/ADR-001-code-driven-bom.md) | BOM 은 코드 관계에서 산출, 저장은 스냅샷으로만 | 조합 폭발 · 규칙 변경에 강함 |
| [002](docs/adr/ADR-002-deterministic-runtime.md) | LLM 은 빌드 타임 번역기, 런타임은 결정론 | 견적에 환각이 들어갈 경로 0 |
| [003](docs/adr/ADR-003-immutable-snapshot.md) | 산출물은 스냅샷만 읽고, 발행 · 발주는 DB 가 잠근다 | 정합성을 구조로 |
| [004](docs/adr/ADR-004-rls-tenant-isolation.md) | 회사 격리 = RLS ENABLE + FORCE | 필터 누락에도 0건 |
| [005](docs/adr/ADR-005-admin-user-db-separation.md) | 관리자 DB① / 사용자 DB② 를 DB 역할로 분리 · 역류 차단 | 데이터 주권 · 신뢰 |
| [006](docs/adr/ADR-006-append-only-revision.md) | 코드 개정은 append-only (DB 권한) | 감사 · 추적 |
| [007](docs/adr/ADR-007-pure-engine-packages.md) | 순수 엔진 패키지와 어댑터 분리 | 테스트 용이 · 교체 가능 |
| [008](docs/adr/ADR-008-production-mode-gate.md) | 운영 모드 e2e 를 머지 게이트에 | 연결 고갈 사고 |
| [009](docs/adr/ADR-009-business-date.md) | "오늘"은 회사 시간대 한 곳에서만 | KST 새벽 단가 사고 |
| [010](docs/adr/ADR-010-auth-scrypt.md) | 비밀번호 = Node 내장 scrypt · SSO 는 자리만 | 외부 의존 0 |
| [011](docs/adr/ADR-011-learning-ai-level1.md) | 학습 AI 1수준 = 결정론 공식 탐구 + 사람 승인 라벨 | 설명 가능 · 재현 가능 (진행 중) |

제품 · 사업 쪽 결정 기록: [`docs/04-decisions/`](docs/04-decisions)

---

## 🔥 트러블슈팅 (실제로 겪은 것만)

| # | 증상 | 원인 | 해결 | 재발 방지 |
|---|---|---|---|---|
| [T-01](docs/troubleshooting.md#t-01) | 운영 빌드에서만 HTTP 500 `too many clients` | 운영 모드에서 PrismaClient 를 속성 접근마다 새로 생성 | 항상 1개 캐시 | 운영 모드 e2e + 연결 수 기록을 게이트에 |
| [T-02](docs/troubleshooting.md#t-02) | 한국 시간 00~09시에 오늘 유효 단가가 "예정"으로 보임 | "오늘"을 UTC 날짜로 자름 | 회사 시간대 기준 `businessToday()` 한 곳 | 새벽 경계 단위 테스트 |
| [T-03](docs/troubleshooting.md#t-03) | 승인 안 된 치수로 도면이 발행될 수 있는 구멍 | 스냅샷 뒤 카탈로그가 바뀌어도 도면 생성 허용 | 카탈로그 지문 불일치 → 409 · 이후 치수를 스냅샷에 박음 | e2e S30 |
| [T-04](docs/troubleshooting.md#t-04) | 한 번도 안 돌던 DB 검증 2종 · 그 안의 제품 결함 | CI 목록 누락 · 초안이 개정 번호를 먹음 | 검증 수리 + 결함 수리 · CI 배선 | DB 검증 목록을 CI 와 README 에서 같게 |
| [T-05](docs/troubleshooting.md#t-05) | 도커 빌드에서만 설정 화면이 "로그인으로" 정적 페이지로 굳음 | 세션 함수가 비밀값 검사를 `cookies()` 호출보다 먼저 해, 비밀값 없는 빌드에서 페이지가 정적으로 프리렌더됨 | `cookies()` 를 먼저 호출(요청마다 렌더되는 표지) | 배포 킷 컨테이너 e2e |
| [T-06](docs/troubleshooting.md#t-06) | 잘린 비밀번호 해시가 통과 | 비교 시 출력 길이를 저장된 해시 길이로 재계산 | 출력 길이 고정 · 형식 검사 | 단위 테스트가 먼저 잡음 |
| [T-07](docs/troubleshooting.md#t-07) | Windows 에서만 e2e 결과 파일 크래시 · 저장 경합 | cp949 기본 인코딩 · 늦게 온 응답이 입력값을 덮음 | utf-8 명시 · 응답 순서 가드 | 3회 연속 통과를 기준으로 |

---

## 📈 진행 현황

| 단계 | 내용 | 날짜 | 상태 |
|---|---|---|---|
| 기반 | pnpm 모노레포 · 인증 · RLS · 매크로 DSL 코어 | 07-02 ~ 07-17 | ✅ |
| 베타 1줄기 | M1 작업대 → M2 Toolbox 실행 고리 → M3 출력(BOM · 원가 · DXF) | 09-15 ~ 09-16 | ✅ |
| P1 · P2 | 코드 등뼈(관계 · 스냅샷) · 플로팅 Toolbox · 역번역 | 09-19 | ✅ |
| P3-a | 플랫폼 관리자 · DB①/② 역할 분리 · 역류 차단 | 09-19 | ✅ |
| P4 · P6 | 치수 → 도면 · 견적 · Tech Data · 구매 · 승인을 스냅샷에 묶기 | 09-20 ~ 09-22 | ✅ |
| 청사진 채우기 | 배치 · 3각법 · 3D · 단가 이력 · ERP 기준정보 · 인쇄 양식 편집기 · 도면 주석 | 09-23 ~ 09-28 | ✅ |
| 운영화 | 운영 모드 게이트 · 비밀번호 로그인 · Office 내보내기 · 배포 킷 · CI · 공개 | 09-27 ~ 09-28 | ✅ |
| 학습 AI 1수준 · Special 첫 사례 | 공식 탐구 · 단방향 투영 · 팬 선정 | 09-29 ~ | 🔄 |
| 다음 | CPQ 고도 계산 연결 · 컨설팅 분석 · CAD 1단계 · MRP/작업지시 | — | ⏳ |

청사진 70쪽 대조: 구현 대상 51쪽 중 **실동 34 · 부분 12 · 미착수 5**(확정판) → 최신 초안 **37 · 9 · 5**. 쪽마다 "있는 것 / 없는 것"은 [`page-map.md`](docs/00-corpus/page-map.md).

---

## ⚠️ 정직 고지

- 실측 환경: Windows 11 로컬(Node 24 · pnpm 9.15.4 · Docker PG16 · Python 3.12) · Linux 샌드박스 재측정 · GitHub Actions CI. **클라우드 배포는 0회**(배포 킷까지).
- **단가 · 기술 표 · 치수 표 · CAD 규칙 · 원가 배율은 모두 샘플**이다. 실 견적은 회사 단가표가 들어와야 한다.
- 도면은 선과 글자 수준(뷰 여섯 종 · 주석)이며 제작도 깊이가 아니다. EDIM 안의 CAD 편집기는 아직 없다.
- 자연어 → 매크로 번역은 **경로와 인터페이스만** 있고 실모델 호출은 0회다(키가 없으면 결정론 폴백).
- 이 프로젝트는 AI 코딩 에이전트와 함께 개발했다. 요구사항 · 설계 결정 · 승인 · 검증 게이트 설계와 판정은 사람이 맡았다 → [`docs/ai/agentic-development.md`](docs/ai/agentic-development.md)

---

## 📁 저장소 지도

| 경로 | 한 줄 |
|---|---|
| `apps/web` | Next.js — 화면 + API(run · dxf · documents · purchase-requests · setup · platform …) |
| `packages/bom-code` | 코드 관계 → BOM 순수 엔진 · 설계 검증 규칙 · 데모 카탈로그 |
| `packages/macro-*` | DSL(파서 · 실행기) · 검증기 · 역번역 · 등록부 |
| `packages/db` | Prisma 스키마 · 마이그레이션 0001~0032 · RLS · 트리거 · DB 검증 스크립트 |
| `packages/auth` · `hierarchy-address` · `core-ontology` · `ui` | 세션 · 주소 · 도메인 타입 · 디자인 시스템 |
| `scripts/demo_e2e.py` | 334단계 발표 시나리오 e2e |
| `docs/architecture` · `ai` · `adr` | 구조 · AI 설계 · 설계 결정 |
| `docs/00-corpus` | 청사진 쪽 지도 · 설계 코퍼스 |
| `docs/01-design` · `04-decisions` | 단계별 설계서 · 제품 결정 로그 |
| `docs/02-reports` · `plan` · `deck` | 청사진 대조 생성기 · 연결 장부 · 발표 자료 |
| `docs/03-handoff` | 설계 AI ↔ 구현 에이전트 인계 · 회수 기록 |

---

## 🌐 English summary

EDIM is a Configure-to-Order (CTO) platform for build-to-order equipment such as air handling units.
A company registers its product rules once — codes, code relationships, tables and approved macros — and one assembled product code then yields the BOM, drawings (DXF), cost, quotation, tech data and purchase requests.
Every output reads the same immutable BOM snapshot, so the quotation total cannot drift from the cost card.
**AI is placed at build time only**: an LLM slot translates natural language into a small macro DSL, which is statically verified, dry-run, reverse-translated into a flowchart for human review, and approved before a deterministic executor runs it — no LLM is called at runtime.
A level-1 learning pipeline (in progress) mines dimension formulas from DXF drawings with an engineering-tolerance metric and projects only human-approved formulas one-way into tenant databases.
Tenant isolation, append-only revisions and locks on issued documents are enforced by PostgreSQL (RLS, triggers, grants).
Verified by a 334-step end-to-end scenario (UI + API + DXF/Office parsing) in both dev and production mode, 270 unit tests and 9 DB verification suites. All prices and rules are samples.

---

## 👤 개발자

| 항목 | 내용 |
|---|---|
| GitHub | https://github.com/parksubeom99 |
| 역할 | 요구사항 분석(청사진 70쪽 · 설계 코퍼스) · 아키텍처 · 설계 결정(ADR) · 검증 게이트 설계 · AI 에이전트 협업 개발 운영 |
| 다른 프로젝트 | [hospitalMSA](https://github.com/parksubeom99/hospitalMSA) · [stockproject](https://github.com/parksubeom99/stockproject) · [energyProject](https://github.com/parksubeom99/energyProject) |

---

© 2026 EDIM. All rights reserved. 이 저장소는 포트폴리오 열람용으로 공개되며, 코드·문서의 복제·배포·상업적 이용을 허락하지 않습니다.
