# EDIM Head Registry in Developer Model

Date: 2026-05-09

이 문서는 EDIM의 Head 자체를 `EDIM Developer`에서 Hierarchy 구조처럼 추가, 수정, 편집하는 작동 방식을 정의합니다.

## 핵심 결정

Head 자체의 추가, 수정, 이동, 비활성화, 삭제 검사는 일반 Main 화면의 별도 패널이 아니라 `EDIM Developer > Module / Head Registry`에서 수행합니다.

```text
EDIM Developer
└─ Module / Head Registry
   ├─ Head Registry
   ├─ Head-Hierarchy Relation
   ├─ Head Edit Guardrail
   └─ Publish / Rollback
```

상단의 `Head 관리` 버튼은 별도 관리 패널을 여는 기능이 아니라 `EDIM Developer > Module / Head Registry`로 이동하는 단축 통로입니다.

## 이유

Head는 EDIM 전체 구조의 최상위 시스템 설정입니다.

따라서 Head를 일반 업무 화면에서 직접 관리하기보다 EDIM Developer의 플랫폼 설정 영역에서 관리해야 시스템 일관성이 유지됩니다.

```text
Head = EDIM Platform Structure
Hierarchy = Head 아래 업무/주소/작업 항목
```

## 관리 대상

`Module / Head Registry`에서 처리하는 기능:

- Head 추가
- Head 이름 수정
- Head 표시 순서 이동
- Head 활성화 / 비활성화
- Head 삭제 검사
- Head Type 설정
- Head 기본 Main Template 설정
- Head 기본 Right Template 설정
- Head-Hierarchy 관계 확인
- Head별 Edit Policy 확인
- 영향 분석
- Publish / Rollback

## 좌측 Panel과의 관계

Head 자체는 EDIM Developer에서 관리합니다.

선택된 Head 아래의 항목은 해당 Head의 좌측 Panel에서 관리합니다.

```text
EDIM Developer > Module / Head Registry
= Head 자체 관리

각 Head의 Left Panel
= 선택된 Head 아래 Hierarchy / Work Type 관리
```

예:

```text
PLM Head 자체 추가/이동/비활성화
→ EDIM Developer > Module / Head Registry

PLM 아래 Sub Code, Product Code, Drawing Management 추가/수정
→ PLM Left Panel
```

## 삭제 원칙

Head에 하부 항목 또는 연결 Asset이 있으면 삭제하지 않습니다.

기본 정책:

```text
하부 항목 없음 + 연결 Asset 없음 → 삭제 가능
하부 항목 있음 또는 연결 Asset 있음 → 비활성화
운영 이력 있음 → 삭제 금지
```

## 운영 흐름

실제 시스템에서는 Head 변경을 다음 절차로 처리합니다.

```text
Draft 변경
→ Validation
→ Impact Analysis
→ Test Tenant Preview
→ Approval
→ Publish
→ Rollback 가능
```

## 결정 사항

Head 자체 관리는 `EDIM Developer > Module / Head Registry`로 통합합니다.

상단 `Head 관리`는 이 화면으로 이동하는 단축 통로입니다.

Head 아래 항목 편집은 각 Head의 좌측 Panel에서 수행합니다.
