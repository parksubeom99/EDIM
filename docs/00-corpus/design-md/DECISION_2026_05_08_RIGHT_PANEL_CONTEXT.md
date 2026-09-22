# Decision: Right Panel Context Templates

Date: 2026-05-08

## 결정

EDIM Core Shell의 우측 패널은 59~61페이지와 같은 작업 보조 정보와 Sub Template을 표시하는 Context Panel로 설계한다.

우측 패널은 상단 Head, 좌측 WorkHierarchy, 중앙 Main UI, 선택된 업무 대상에 따라 동적으로 호출된다.

## 이유

EDIM 업무는 BOM, Code Relationship, Design Tool, Coding, Table Management, Drawing, Document, Approval, EDIM Run 결과처럼 한 화면에서 참조해야 할 보조 정보가 많다.

이를 중앙 Main UI에 모두 넣으면 화면이 복잡해지므로, 우측 패널을 Accordion 방식의 Context Panel로 구성한다.

## 원칙

- 우측 패널은 고정 화면이 아니다.
- Template Binding으로 호출한다.
- 권한 없는 Sub Template은 숨긴다.
- 선택된 업무 대상에 따라 내용이 바뀐다.
- EDIM Run 결과, 승인 대기, 오류 상태는 Badge로 표시할 수 있게 한다.

