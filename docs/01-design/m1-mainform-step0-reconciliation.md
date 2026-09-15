# M1 MainForm — STEP 0 대조표 (설계값 ↔ 실명)

- 일자: 2026-09-15 · 실행: 엘(샌드박스, CC 역할) · 브랜치: `feat/m1-mainform`
- 설계 SSOT: `M1_mainform_blueprint.html` (2026-08-14) + `ccmd-20260814-M1-mainform.md`
- 실측 기준: `parksubeom99/EDIM` main `7718884` (pushed_at 2026-07-17)

## 환경 실측 (H-31)

| 항목 | 실측 |
|---|---|
| 원격 | `parksubeom99/EDIM` private · 브랜치 `main`, `import/ts-monorepo` |
| M1 기구현 (H-30) | `apps/web`에 MainForm/CodeBuilder/Inspector/ActionBar/WorkHierarchy **히트 0 → 미구현** |
| 코퍼스 | repo 내 md 11개, `docs/00-corpus`는 README stub → **88md 코퍼스 repo에 없음** |
| 기준선 | typecheck 9패키지 GREEN · vitest 113/113(hierarchy 18·dsl 48·registry 15·verify 19·compile 13) · auth(DB) PASS |
| DB | PostgreSQL 16 로컬 클러스터(:5433) · migrate 0001~0004 · seed 2 tenants/3 users/7 nodes/1 project |

## 설계값 ↔ 실명 대조

| 설계도(§3, p24 9테이블) | 실 스키마(`packages/db/prisma/schema.prisma`) | M1 매핑 결정 |
|---|---|---|
| Projects | `Project` (projectNo·name·type·clientName·itemType·salesStage·status) | 그대로 |
| Work Hierarchy 트리 | `HierarchyNode` (stableId·parentStable·kind·label·position) + `getTree()` | 그대로 (기존 `HierarchyTree` 재사용, 클릭 → `/workbench?node=`) |
| Approvals | `ProjectApproval` (state: requested/approved/rejected · note) | 2계층 상태기계를 **note 접두어 규약**으로 파생: `tier:org` = 조직 승인, `tier:platform` = 플랫폼 승인. Design(없음/최근 rejected) → Check(org requested) → Approve(org approved) → Accepted(platform approved) |
| Revisions (Schedule) | **없음** | `ProjectTask`(title·state·dueAt)로 Schedule 표시. Revision 번호는 M2 이후 스키마 결정 대상 |
| Files (Data Up-Load) | `ProjectAttachment` (department·docType·name·fileRef) | 그대로 |
| Parts · BOM · Materials · Drawings · Dimension | **없음** | M1 범위 밖. BOM/Design 탭은 자리(placeholder) + M2/M3 이음새만. RCCS 조립 코드 **영속 저장은 스키마 필요 → Tier B 기록(M2 결정)**, M1은 실시간 조립·검증만(D3 DoD 그대로) |
| RCCS 카탈로그(A~F 슬롯) | 테이블 없음 | `apps/web/app/lib/rccs.ts` 정적 카탈로그(문법 확정치: 접두 EU/ER/EC=제품군, 후행 숫자=슬롯 순번). 실 카탈로그 값은 회장님 주입 대상 |

## 패키지 실명

| 설계도 | 실 export |
|---|---|
| hierarchy-address | `parseUri/buildUri/resolveUri/resolveInTree/toUri/slug` |
| core-ontology | `ROLES`, `NODE_KINDS`, `HierarchyTreeNode`, Brand id types |
| macro-verify | `verify/review/verifyAst/checkCycles/dryRun/diagnostic` |
| macro-registry | `canApprove/canReject/canTransition`, `MacroStatus` |
| ui | `AppShell, CodeChip, StableIdBadge, ThemeToggle, DataTable` |
| db | `withTenant`, `getTree`, `getProjectByStable`, `listTasks/listAttachments/listApprovals`, `requestApproval/decideApproval` |
| auth | `withTenantSession`, `getServerSession`(app lib) |
| 권한 | `canEditProject`(owner/engineer/sales) · `canDecideApproval`(owner/engineer) |

## 구현 결정

- 신규 라우트 `/workbench` (p56 5영역). 기존 `/`(AppShell 3패널)는 **무변경** — 회귀 0 원칙.
- 서버: RSC로 tree·project·approval 로드, `POST /api/rccs/assemble`(조립+검증), `POST /api/run/{bom|edim|ebom|cost}` **stub 200**, `GET /api/export?project=` 실동(JSON).
- 클라: `MainFormShell`(5영역) · `CodeBuilder`(A~F) · `Inspector` · `ActionBar` · `WorkPlace` 탭.
- 승인 전이는 기존 `POST /api/projects/[id]/approvals`, `POST /api/project-approvals/[id]` 재사용(note에 tier 규약).

## Tier B 기록 (중단 아님 · M2 착수 시 결정)

1. RCCS 조립 코드의 영속 저장 테이블 부재 (Project.itemType은 자유 텍스트).
2. Revision 모델 부재 — p24 Revisions(번호·일자·사유·내용·작성자).
