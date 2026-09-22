# Decision: Head Tree Management Uses EDIM Developer Tree

Date: 2026-05-10

## Decision

Head도 EDIM의 상위 Hierarchy Node로 보고, EDIM Developer 좌측 Tree에서 관리한다.
개발자는 `Head Tree Management`를 선택하고 중앙 Panel에서 Windows Explorer 방식의 Head Tree 관리 Template을 확인한다.

## Structure

```text
EDIM Developer
└─ Platform Structure
   └─ Head Tree Management
      ├─ Head Structure
      ├─ Head Display Order
      ├─ Head Template Binding
      ├─ Head Permission
      ├─ Head Approval / History
      └─ Head Impact Analysis
```

## Template Rule

Each detailed Tree item calls its own center Template.

| Tree Item | Center Template |
| --- | --- |
| Head Tree Management | Head Tree Management Template |
| Head Structure | Head Structure Template |
| Head Display Order | Head Display Order Template |
| Head Template Binding | Head Template Binding Template |
| Head Permission | Head Permission Template |
| Head Approval / History | Head Approval History Template |
| Head Impact Analysis | Head Impact Analysis Template |

## Editing Model

UI direction:

- Windows Explorer style Tree
- expand / collapse
- right-click menu later
- drag and drop later
- property panel
- Template Binding panel
- Permission panel
- Approval / History panel

Safety rules:

- Head 이동 전 영향 분석
- `stableKey` 유지
- 삭제 대신 비활성화
- Head 변경은 승인 및 Release History 기록
- 연결된 Template, Permission, Data, File, Drawing 영향 확인

## Prototype Update

The prototype now shows Head Tree Management under:

`EDIM Developer > Platform Structure > Head Tree Management`

Selecting this item or its children displays the corresponding center Template.

