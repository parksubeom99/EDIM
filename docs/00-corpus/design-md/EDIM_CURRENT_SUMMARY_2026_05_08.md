# EDIM Current Summary

Date: 2026-05-08

이 문서는 지금까지 논의한 EDIM의 핵심 방향과 설계 결정을 요약한 현재 기준 문서입니다.

## 1. EDIM의 목표

EDIM은 CTO/ETO Business를 수행하는 회사들이 겪는 문제를 해결하기 위한 SaaS 기반 통합 플랫폼입니다.

핵심 목표는 다음과 같습니다.

```text
제품 선택 / Configuration
→ Product Code / Sub Code / Arrangement Code
→ Code Relationship
→ 자동 BOM
→ Macro / AI 계산
→ 도면 치수 설계
→ 기술자료 / 견적 / 승인도서 / 제작도면 생성
→ ERP / PLM / Digital Twin 연계
```

EDIM의 핵심 가치는 CPQ, PLM, ERP 기능을 단순히 붙이는 것이 아니라, 제품 코드와 관계형 데이터를 중심으로 모든 업무자료를 자동 생성하는 것입니다.

## 2. EDIM 기본 골격

EDIM은 먼저 `EDIM Core Shell`을 만들고, 그 안에 CPQ, PLM, ERP, Toolbox, AI, Mobile, Digital Twin 기능을 붙입니다.

기본 화면 구조:

```text
상단 Header / Head
좌측 Work Panel
중앙 Main Panel
우측 Context Panel
좌측 하단 Task / Schedule Panel
```

Head를 선택하면 연결된 Template이 좌측, 중앙, 우측에 호출됩니다.

## 3. Login / Tenant / 사용자 승인

EDIM은 SaaS이므로 사용자는 Login 후 회사 관리자에게 승인받아야 합니다.

기본 흐름:

```text
Login
→ User Account 확인
→ Tenant Membership 확인
→ 승인 상태 확인
→ 권한 로드
→ Tenant Branding 로드
→ EDIM Core Shell 진입
```

User Account와 Tenant Membership은 분리합니다.

한 사용자가 여러 회사에 소속될 수 있어야 합니다.

## 4. Tenant Branding

회사별 로고와 회사명을 Header에 표시합니다.

Tenant Branding은 단순 장식이 아니라 현재 사용자가 어느 회사의 데이터에서 작업 중인지 알려주는 `Tenant Context`입니다.

초기 범위:

- 회사명
- 회사 로고
- 작은 로고
- Header 표시
- 문서용 로고는 이후 확장

## 5. Head 구조

Head는 고정 메뉴가 아닙니다.

개발자 또는 권한 있는 관리자가 Head를 추가, 이동, 이름 변경, 비활성화할 수 있어야 합니다.

Head는 두 종류로 봅니다.

```text
Business Head:
CPQ, PLM, ERP, Sales, Tech, Purchasing, Material, Manufacturing, QC 등

System/Admin Head:
System Setup, Company Info, User & Permission, Template Registry, Hierarchy Management 등
```

초기 Head 후보:

- CPQ
- PLM
- ERP
- EDIM Toolbox
- Company Info
- System Setup

## 6. Hierarchy 구조

Hierarchy는 단순 메뉴가 아닙니다.

Hierarchy는 EDIM의 DB Address 역할을 합니다.

```text
Hierarchy = Data Address + Work Address + Template Address + Permission Address + EDIM Run Address
```

Hierarchy는 Head에 따라 다르게 호출될 수 있고, 공통으로도 사용할 수 있습니다.

구분:

- Head-Owned Hierarchy: 해당 Head에서 직접 생성/편집
- Shared Hierarchy: 여러 Head에서 공통으로 호출
- Copied Hierarchy: 공통 구조를 복사 후 독립 편집
- Referenced With Override: 공통 Hierarchy를 호출하되 표시 조건만 Head별 조정

Hierarchy는 깊이 제한 없는 Tree 구조입니다.

## 7. Hierarchy와 실제 데이터의 관계

Hierarchy는 데이터를 직접 저장하지 않습니다.

Hierarchy는 주소와 분류로만 사용하고, 실제 데이터는 별도 엔티티에서 관리합니다.

```text
HierarchyNode
→ HierarchyAssetLink
→ Code / Table / Drawing / Document / Macro / File
```

중요 원칙:

- 내부 참조는 `hierarchy_node_id` 또는 고유 ID 사용
- `path`는 표시와 검색용
- 위치 변경은 `HierarchyPathHistory`와 `AuditLog`에 기록
- 기존 참조 보호를 위해 Alias / Redirect 구조를 고려
- 연결 Asset이 있으면 삭제보다 비활성화 우선

## 8. 권한 구조

권한은 고정 Role만으로 처리하지 않고 확장 가능한 PermissionPoint 방식으로 설계합니다.

```text
새 기능 추가
→ PermissionPoint 등록
→ Role 또는 User에게 PermissionGrant 부여
→ Head / Template / EDIM Run / API에서 권한 확인
```

권한이 필요한 주요 영역:

- Head 접근
- Hierarchy 접근
- Template 사용/편집
- EDIM Run 실행
- 승인/반려
- Macro 생성/실행
- System 자료 접근

## 9. Template 구조

중앙 Main Panel과 좌우측 Panel은 Template을 호출하여 구성합니다.

Template 종류:

- System Template
- Tenant Template
- Department Template
- User Template
- User Edited Template

System Template은 직접 수정하지 않습니다.

사용자는 Copy, Fork, Override 방식으로 편집합니다.

호출 우선순위:

```text
User Override Template
→ Department Template
→ Tenant Template
→ System Template
```

Template은 Version, Dependency, Publish, Approval, Access Policy를 가져야 합니다.

## 10. 중앙 Main Panel

중앙 Main Panel은 선택된 Head/Hierarchy 업무를 실제로 처리하는 주 화면입니다.

중앙 Panel에는 해당 업무의 핵심 입력, 조회, 실행 기능만 둡니다.

우측 Detail, History, Macro, Table, Approval 등은 Context Panel로 분리합니다.

첫 핵심 업무 화면은 `BOM CODE`로 정리합니다.

## 11. 우측 Context Panel

우측 Panel은 59~61페이지와 같은 Sub Work Place 역할을 합니다.

Head, Hierarchy, 중앙 Main UI, 선택된 업무 대상에 따라 Accordion 방식으로 Template이 호출됩니다.

주요 내용:

- Code Detail
- Code Relationship
- Sub Item List
- Drawing
- Table
- Macro / Coding
- Design Tool
- Cost
- Approval
- History
- EDIM Run Result

## 12. 좌측 하단 Task / Schedule

좌측 Hierarchy 아래에는 사용자의 일정, 해야 할 일, 지연 업무, 승인 대기, 후속 업무를 표시하는 Template을 둡니다.

ERP 업무 흐름에서 전 단계 완료 시 후속 담당자에게 자동 Task가 생성될 수 있어야 합니다.

예:

```text
영업 견적 완료
→ 기술 검토 Task 자동 생성
→ 구매 요청 Task 자동 생성
→ 자재 확인 Task 자동 생성
→ 생산 지시 Task 자동 생성
→ QC 검사 Task 자동 생성
```

Dashboard에서는 전체 Project, 담당 업무, 지연 업무, 부서별 진행 상태를 표시합니다.

## 13. Approval / Report

EDIM에는 공통 Approval & Report Engine이 필요합니다.

승인 대상:

- 견적
- BOM
- 도면
- 승인도서
- 구매요청
- 발주
- 품질검사
- Macro
- Product Code
- 비표준 Option
- Template 변경

승인 방식은 사용자가 설정할 수 있어야 합니다.

지원해야 할 방식:

- 단일 승인
- 순차 승인
- 병렬 승인
- 조건부 승인
- 역할 기반 승인
- 대리 승인
- 반려 / 보완 / 재상신
- 변경 시 재승인

## 14. Mobile App / SNS형 Activity Feed

회사 현장 업무를 위해 Mobile App이 필요합니다.

용도:

- 자재 입출고
- 품질 관리
- 생산/공정 기록
- 설치 / A/S
- Digital Twin 현장 기록
- 사진 / 동영상 / 댓글 / 멘션

SNS 기능은 공개 SNS가 아니라 `Enterprise Work Feed`입니다.

Audit Log와 Activity Feed는 분리합니다.

```text
Audit Log = 시스템/법적 추적
Activity Feed = 사람이 이해하는 업무 흐름과 커뮤니케이션 기록
```

## 15. Sub Code / Product Code / Code Relationship

28~35페이지 구조는 EDIM의 핵심 데이터 구조입니다.

작업 흐름:

```text
Sub Code 등록
→ Raw Data / 원자재 / 구매자재 / 제품 스펙 정리
→ Product Code 생성
→ Product Code가 Sub Code를 호출
→ Code Relationship 설정
→ 각 Code에 자료 업로드/연결
→ BOM Run
```

Sub Code는 Raw Data에 해당합니다.

Product Code는 Sub Code를 복사하는 것이 아니라 참조/호출하여 만듭니다.

Code별 자료는 우측 Panel에서 Upload하지만 실제로는 Asset Link로 연결합니다.

## 16. Sub Code 변경 안전성

Sub Code가 변경되면 Product Code와 Part Relationship에 큰 영향을 줄 수 있습니다.

따라서 다음 장치가 필요합니다.

- Stable Key
- Internal ID
- Version / Revision
- Path History
- Alias / Redirect
- Impact Analysis
- Change Request
- Approval
- Snapshot
- Rollback
- Relationship Health Check

사용 중인 Sub Code는 직접 수정하지 않고 새 Version 또는 Revision을 만들어야 합니다.

## 17. BOM CODE 중앙 Panel

BOM CODE는 중앙 Main Panel의 첫 핵심 업무 화면입니다.

역할:

- Product Code 선택
- Code Segment 표시
- Parent / Child Relationship 설정
- Sub Code / Material / Purchase Item 연결
- BOM Run Preview
- Validation
- Approval / Publish

흐름:

```text
Product / Arrangement Selection
→ Product Code
→ Code Relationship
→ Sub Code / Material Code / Purchase Item
→ BOM Code Run
→ BOM / Part List / Cost / Drawing / Document
```

## 18. Macro / AI

AI는 자동 실행보다 Macro 생성 보조와 검증 가능한 제안 역할로 시작합니다.

AI 역할:

- Macro 초안 생성
- 조건식 생성
- 치수 관계 제안
- 누락 부품 탐지
- 오류 설명
- 조립 순서/주의사항 초안
- Drawing Command 제안

AI가 만든 Macro와 Drawing Command는 검토/승인 후 실행합니다.

## 19. 도면 / 조립도 / Arrangement

도면은 목적별로 구분합니다.

- 제조용 도면: 원본 CAD와 높은 일치성 필요
- 조립도 / 승인도 / 기술자료용 도면: 가벼운 파생 도면 가능
- Digital Twin: 시각화와 상태 정보 중심

조립도는 기초도면과 Component를 호출하여 생성합니다.

```text
Base Drawing / Component
→ Assembly Definition
→ Assembly Rule / Sequence / Caution
→ Dimension Relationship
→ Macro / AI Assist
→ Assembly Drawing / View / Export
```

Arrangement Set-up에는 2D 3각법과 3D View를 함께 둡니다.

2D와 3D는 같은 Parameter Set을 공유해야 합니다.

FreeCAD 등은 EDIM UI에 전체 Embed하기보다 CAD Adapter / Worker로 사용하는 방식을 우선 검토합니다.

## 20. EDIM Run Job Engine

EDIM Run은 시간이 걸리는 작업이므로 Job Engine으로 처리합니다.

Run 종류:

- BOM Run
- Cost Run
- Pricing Run
- Drawing Run
- Document Run
- Technical Data Run
- Macro Run

상태:

- queued
- running
- completed
- failed
- cancelled
- retrying

## 21. 지금까지의 핵심 결론

EDIM의 실제 심장은 다음 네 가지입니다.

```text
RCCS Code Engine
Rule / Constraint Engine
Macro / AI Engine
Drawing Parameter / Assembly Engine
```

EDIM Core Shell은 이 엔진들이 안정적으로 작동하기 위한 플랫폼 골격입니다.

## 22. 다음 집중 단계

다음 단계는 BOM CODE를 중심으로 진행합니다.

우선순위:

1. Sub Code / Product Code / Code Relationship 용어 확정
2. BOM CODE DB Schema 초안
3. BOM CODE 중앙 Main UI Wireframe
4. 우측 Panel Binding 목록
5. 조건 없는 BOM Run MVP 설계
6. 조건부 Rule Engine 설계
7. Sub Code 변경 영향 분석 모델
8. BOM Run Snapshot / Version 구조
9. CPQ Product Selection과 BOM CODE 연결

