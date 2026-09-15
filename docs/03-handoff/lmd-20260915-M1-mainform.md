# lmd — M1 메인폼 워크벤치 (2026-09-15 · 엘 샌드박스 실행)

브랜치 `feat/m1-mainform` · 커밋 f2fd4b6 → 69ade62 → ea2be9b · 원격 push 완료

## M1 · 메인폼 워크벤치 실동 (p56 5영역)

설계 SSOT: M1_mainform_blueprint (2026-08-14) · STEP 0 대조표: `docs/01-design/m1-mainform-step0-reconciliation.md`

### 새 라우트 `/workbench?node=<stable>`
- **Toolbar 3층** — L1 모듈 네비(CPQ/PLM/ERP)+부서칩 / L2 프로세스 바 Design→Check→Approve→Accepted / L3 캔버스 명령 + 작업 탭
- **Work Hierarchy** — `HierarchyNode` DB 트리 재사용(`basePath` 옵션, 기존 `/` 무변경) + 설계 심볼 팔레트
- **Main/Sub/Key Work Place** — Design(SVG 배치도, 슬롯 반응) · BOM(M2 seam) · **Code Builder A~F** · Macro · Document + Sub(현재 코드/검증) · Key(핵심 치수)
- **Inspector** — Code · Spec · Data Up-Load(`ProjectAttachment`) · Schedule(`ProjectTask`) · **Approval 2계층 전이** · Description
- **Action Bar** — BOM/EDIM/EBOM Run · Cost = `POST /api/run/{kind}` **stub 200(인터페이스 고정)** · Export = `GET /api/export` **실동 JSON** · Print

### 서버 권위
- `POST /api/rccs/assemble` 조립+규칙검증(서버) · 승인 전이는 기존 `/api/projects/[id]/approvals`·`/api/project-approvals/[id]` 재사용(note `tier:org|platform` 규약, **신규 스키마 0**)

### DoD 실측 (Playwright, seed owner@acme.test)
| DoD | 결과 |
|---|---|
| D1 5영역 렌더 | 5/5 testid 존재 |
| D2 트리 DB 렌더 | seed 프로젝트 `PS-61313-5 Micron` 표시 |
| D3 슬롯→코드 즉시 | `EU-55-2123` → D=630 `EU-55-2123-630` → F `…-1-21-13-15`, 서버 assemble ok |
| D4 Inspector 바인딩 | project 바인딩 1, Spec에 projectNo |
| D5 승인 persist | reload마다 Design→Check→Approve→Approve(플랫폼 요청)→**Accepted** |
| D6 Action Bar | BOM Run → `stub` 200 · Export 200 JSON(pipeline=Accepted) |
| D7 테스트 | apps/web vitest 18/18 · 전체 typecheck 10 GREEN · 기존 패키지 113/113 · auth(DB) PASS |

### Tier B 기록 (M2 결정 대상, 중단 아님)
1. RCCS 조립 코드 영속 테이블 부재 → M1은 실시간 조립만(새로고침 시 슬롯 초기화)
2. Revision 모델 부재(p24)
3. CI 워크플로는 `docs/ci/ci.yml`에 대기 — PAT `Workflows` 권한 추가 후 `.github/workflows/`로 이동

작성: 엘(샌드박스, CC 역할) · 2026-09-15

## 남은 seam (M2 착수 전)
- Action Bar Run 4종 = stub. M2에서 macro-compile/verify + 결정론 실행기로 교체
- BOM 탭 = Run 결과 표시 자리 확보(M3에서 실 BOM 테이블·DXF·원가 패널)
- 슬롯 상태 영속(URL/DB)은 스키마 결정 후
