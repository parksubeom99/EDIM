# Decision: Head Registry in EDIM Developer

Date: 2026-05-09

## Status

Accepted

## Decision

Head 자체의 추가, 수정, 이동, 비활성화, 삭제 검사는 `EDIM Developer > Module / Head Registry`에서 수행한다.

상단 `Head 관리` 버튼은 이 화면으로 이동하는 단축 통로로 사용한다.

## Rationale

Head는 EDIM 전체 시스템 구조의 최상위 설정이다.

따라서 Head 자체 관리를 EDIM Developer 영역에 통합해야 시스템 관리 방식이 일관된다.

각 Head 아래의 Hierarchy 또는 Work Type 항목 편집은 해당 Head의 좌측 Panel에서 처리한다.

## Consequences

- Header에서는 Head 관리 패널을 직접 열지 않는다.
- Header의 `Head 관리`는 `EDIM Developer > Module / Head Registry`로 이동한다.
- Head Registry 중앙 화면에서 Head 추가, 이름 수정, 이동, 비활성화, 삭제 검사를 수행한다.
- Head에 하부 항목이나 Asset이 있으면 삭제 대신 비활성화한다.
- 실제 운영에서는 Validation, Impact Analysis, Approval, Publish, Rollback 흐름을 둔다.

## Related Documents

- `EDIM_DEVELOPER_CONSOLE_HEAD_MODEL.md`
- `EDIM_DEVELOPER_WORK_TYPE_OPERATION_MODEL.md`
- `EDIM_HEAD_MANAGEMENT_OPERATION_MODEL.md`
- `EDIM_CORE_CONFIG_MODEL.md`
