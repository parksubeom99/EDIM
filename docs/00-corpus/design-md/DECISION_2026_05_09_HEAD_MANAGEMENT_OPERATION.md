# Decision: Head Management Operation

Date: 2026-05-09

## Status

Accepted

## Decision

Head 자체의 추가, 삭제, 이동, 이름 변경, 비활성화는 `Head 관리` 패널에 모은다.

좌측 Panel의 편집 기능은 선택된 Head 아래의 Hierarchy 또는 Work Type 항목을 관리하는 기능으로 제한한다.

## Rationale

Head 자체 관리 기능과 Head 내부 항목 편집 기능이 섞이면 사용자가 `Head 추가`와 `Head 아래 항목 추가`를 혼동할 수 있다.

따라서 관리 범위를 다음처럼 분리한다.

```text
Head 관리 = Head 자체 설정
Left Panel = 선택된 Head 내부 항목 설정
```

## Consequences

- Header에는 Head 선택과 Head 관리 진입만 둔다.
- `Head 추가`는 `Head 관리` 패널 안에 배치한다.
- 좌측 Panel의 추가 버튼은 선택된 Head 아래 항목 추가로 해석한다.
- EDIM Developer Head에서도 같은 원칙을 적용한다.

## Related Documents

- `EDIM_CORE_UI.md`
- `EDIM_CORE_CONFIG_MODEL.md`
- `EDIM_DEVELOPER_CONSOLE_HEAD_MODEL.md`
- `EDIM_LEFT_HIERARCHY_BINDING_MODEL.md`
