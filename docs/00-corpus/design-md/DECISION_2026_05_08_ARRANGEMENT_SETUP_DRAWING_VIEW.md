# Decision: Arrangement Setup and Drawing Views

Date: 2026-05-08

## 결정

EDIM Arrangement Set-up에는 용도별 도면 위치 설정, Design Tool 설정, 2D 3각법 View, 3D View를 포함한다.

Arrangement Set-up은 도면 생성과 조립 기준을 정하는 핵심 설정으로 본다.

## 이유

CTO/ETO 제품은 Arrangement에 따라 조립 구조, 도면 위치, 치수 관계, 제조용 정보가 달라진다.

2D 3각법과 3D View를 함께 제공하면 작업자가 배치와 치수 관계를 더 쉽게 검토할 수 있다.

## 원칙

- 도면 용도별로 처리 방식을 다르게 한다.
- 2D와 3D는 같은 Parameter Set을 공유한다.
- Design Tool과 Macro는 Arrangement에 Binding한다.
- CAD 전체 기능을 Embed하기보다 EDIM Arrangement Workbench를 우선한다.
- FreeCAD 등은 CAD Adapter/Worker로 활용하는 방식을 우선 검토한다.

