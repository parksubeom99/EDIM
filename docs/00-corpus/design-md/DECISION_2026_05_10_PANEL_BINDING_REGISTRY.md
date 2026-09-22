# Decision: Head Panel Binding Registry

Date: 2026-05-10

## Decision

EDIM은 Template 자체를 모두 만든 뒤 연결하는 방식이 아니라, Template이 완성되기 전에 Head ↔ Panel Binding Registry를 먼저 만든다.

## Meaning

현재 단계에서 만드는 것은 실제 Template 화면이 아니라 다음 연결 정보이다.

- Head가 선택되었을 때 호출할 Left Panel Template
- Head가 선택되었을 때 호출할 Center Main Template
- Head가 선택되었을 때 호출할 Right Panel Group
- 우측 Accordion Module 조합
- 기본 Hierarchy
- 권한 조건
- 편집 정책
- Binding 상태

## Reason

EDIM은 CPQ, PLM, ERP, BOM, Drawing, AI Macro 등 여러 엔진을 Main Shell에 붙이는 구조이다. Template 구현을 먼저 시작하면 Head별 화면 호출 기준이 흔들릴 수 있다.

따라서 Main Shell을 고정하고, Head별 화면 변화는 Panel Binding으로 처리한다.

## Prototype Update

EDIM Developer > Module / Head Registry 화면에 다음 기능을 추가했다.

- Panel Binding Registry 편집 Form
- Head ↔ Panel Binding Matrix
- Template Placeholder Registry
- Right Accordion Module 선택
- Binding Status / Permission / Edit Policy 저장

## Next Work

다음 단계는 실제 Template Registry를 더 구체화하는 것이다.

- Template ID 체계
- System / Tenant / User Template 구분
- Template Version
- Template Fork / Override 규칙
- Published Binding 승인 절차
- Binding 변경 Audit History

