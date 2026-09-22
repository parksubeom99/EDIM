# Decision: Panel Component DB And Panel Template Builder

Date: 2026-05-10

## Decision

EDIM은 좌측, 중앙, 우측 Panel을 코드로 고정하지 않고, Panel Component DB와 Panel Template Builder를 통해 조합한다.

## Reason

Head만으로는 충분하지 않다. 같은 Head 안에서도 하위 항목에 따라 필요한 좌/중/우 Panel 조합이 달라진다.

예:

- PLM > Sub Code: Sub Code Registry + Code Detail
- PLM > Product Code: Product Code Builder + Sub Item + BOM
- PLM > Relationship: Relationship Runner + Part List Running Test
- PLM > Drawing Management: Drawing Setup + Design Tool + Drawing

따라서 Binding 기준은 다음이 되어야 한다.

`Tenant + Head + Head 하위 항목 / Hierarchy Node + 권한 + 상태 → Panel Template`

## Prototype Update

EDIM Developer에 Panel Template Builder를 추가했다.

위치:

`EDIM Developer > Permission / Template > Panel Template Builder`

구현 내용:

- Panel Component DB
- Head / Head 하위 항목 선택
- 좌측 Component 조합
- 중앙 Component 선택
- 우측 Component 조합
- 권한, 편집 정책, 상태, 비고 저장
- Template Preview
- Template Registry Summary

## Next Work

- Component별 세부 설정 Schema
- Template Version 관리
- Published 변경 승인 Flow
- Tenant Override / User Custom Template 생성 방식
- Panel Template을 실제 Main Shell 호출 로직과 연결

