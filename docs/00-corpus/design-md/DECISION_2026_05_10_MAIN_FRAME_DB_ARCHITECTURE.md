# EDIM Main Frame, DB, and Language Direction - 2026-05-10

## Main 기본 틀 결정

EDIM Main의 기준 구조는 다음으로 확정한다.

1. 상단 Head는 업무 영역을 선택한다.
2. 좌측 Hierarchy Tree는 Data의 주소 역할을 한다.
3. 중앙 Main Panel은 선택된 주소에서 실제 진행할 업무 내용을 표시한다.
4. 우측 Panel은 선택된 Hierarchy에 필요한 세부 작업, 자료, 승인, 이력, 도구를 처리한다.

이 구조는 CPQ, PLM, ERP, BOM Code, 도면, 승인, AI Macro를 붙일 때 전체 시스템이 흔들리지 않게 하는 EDIM의 기본 골격이다.

## 현재 Prototype의 DB 형식

현재 Prototype은 실제 서버 DB를 사용하지 않는다.

- 형식: Browser `localStorage`
- 저장 데이터: JavaScript Object를 `JSON.stringify()` 한 JSON 문자열
- Head / Hierarchy 저장 Key: `edim-main-prototype-v02`
- Tenant Branding 저장 Key: `edim-tenant-branding-v01`
- 기본 Sample Data는 `app.js` 내부 함수에서 생성한다.

현재 Prototype에 저장되는 주요 구조는 다음과 같다.

- Head: `id`, `label`, `type`, `title`, `mainTemplate`, `leftTemplate`, `rightTemplate`, `status`
- Head Hierarchy: `id`, `parentId`, `label`, `kind`, `binding`, `assetLinks`, `mainTemplate`, `rightTemplate`, `requiredPermission`, `stableKey`, `owner`, `updatedAt`
- Panel Binding: Head 선택 시 좌측, 중앙, 우측 Template을 연결하는 설정
- Tenant Branding: 회사별 Logo, 색상, 표시명

Prototype의 목적은 화면 구조와 사고 흐름을 확인하는 것이다. 실제 SaaS 제품에서는 이 방식으로 운영하면 안 된다.

## Prototype 저장 방식의 한계

- 사용자 PC와 브라우저에만 저장된다.
- 여러 회사와 여러 사용자가 동시에 사용할 수 없다.
- 권한, 승인, 감사 이력, 백업, 복구가 불가능하다.
- 파일, 도면, Excel, CAD Data를 안정적으로 관리할 수 없다.
- Sub Code와 Product Code의 연결 추적, 변경 이력, 영향 분석을 보장할 수 없다.

따라서 Prototype 이후에는 반드시 백엔드 서버와 정식 DB로 전환해야 한다.

## 실제 SaaS DB 권장 구조

EDIM의 주 DB는 PostgreSQL을 권장한다.

이유:

- SaaS Multi-Tenant 구조에 적합하다.
- 관계형 Data, BOM, 승인, 권한, 이력 관리에 강하다.
- JSONB, Recursive Query, Row Level Security, Transaction을 지원한다.
- `pgvector`를 붙이면 AI 검색과 의미 기반 추천도 확장 가능하다.

권장 DB/Storage 조합:

- PostgreSQL: 업무 Data, Head, Hierarchy, Code, BOM, 권한, 승인, 이력
- Object Storage: 도면, CAD, Excel, PDF, 이미지 등 실제 파일 저장
- Redis: Session, Cache, 작업 Queue
- Search Index: Code 중복 검색, 문서 검색, 품목 검색
- Vector Index: AI Macro, 유사 업무, 유사 Code 추천
- Audit/Event Table: 모든 변경 이력과 승인 이력의 불변 기록

Graph DB는 처음부터 필수는 아니다. Hierarchy와 BOM 관계는 PostgreSQL의 `node`, `edge`, `path_history`, `where_used` Table로 먼저 구성하고, 관계 분석이 매우 복잡해지면 Neo4j 같은 Graph DB를 보조로 검토한다.

## DB 주요 Table Group

초기 설계에서 필요한 Table Group은 다음과 같다.

- Tenant / Company / Department / User / Role / Permission
- Head Tree / Hierarchy Tree / Panel Template / Panel Binding
- Code Master / Code Revision / Sub Code / Product Code / Sub Item
- Part Relationship / Mother-Child Relation / Where Used / Impact Analysis
- BOM / BOM Revision / Effectivity / Lifecycle Status
- Approval Workflow / Approval Step / Report / Comment / History
- File / Drawing / CAD Adapter / Derived Preview / Version
- Macro / AI Rule / Execution Log / Calculation Result
- Task / Schedule / Handoff / Delay Alert / Dashboard
- Audit Log / Event Log / Change Request / Publish History

핵심 원칙은 `stable_id`와 `revision_id`를 분리하는 것이다. 위치와 이름은 변경될 수 있지만, 연결 관계와 이력은 고정 ID로 추적해야 한다.

## 권장 프로그램 언어와 기술

EDIM은 한 가지 언어만으로 끝내기 어렵다. 다만 중심 언어를 줄여 복잡도를 관리해야 한다.

권장 구성:

- Frontend: TypeScript + React
- Main Backend API: TypeScript + Node.js, NestJS 또는 Fastify
- DB: PostgreSQL, SQL, Migration Tool
- AI / Macro / 계산 Engine: Python
- CAD Adapter: CAD 종류에 따라 Python, C#/.NET, C++를 선택
- 3D / Digital Twin Viewer: Three.js
- Mobile App: React Native 또는 Flutter. TypeScript 재사용을 고려하면 React Native가 유리하다.

EDIM의 기본 SaaS 업무 로직은 TypeScript 중심으로 만들고, AI 계산과 CAD 자동화는 Python/C#/C++ Worker Service로 분리하는 것이 좋다.

## 다음 단계 제안

1. 현재 Prototype은 Main 구조 검증용으로 유지한다.
2. 다음 단계에서 Backend Skeleton을 만든다.
3. PostgreSQL 기준의 핵심 DB Schema 초안을 만든다.
4. Login, Tenant, User, Permission을 먼저 구현한다.
5. Head Tree, Hierarchy Tree, Panel Binding을 DB 기반으로 이전한다.
6. 이후 Sub Code, Product Code, Relationship, BOM Engine을 붙인다.

