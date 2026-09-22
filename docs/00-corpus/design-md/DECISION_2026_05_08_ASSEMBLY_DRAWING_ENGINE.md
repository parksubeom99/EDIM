# Decision: Assembly Drawing Engine

Date: 2026-05-08

## 결정

EDIM은 기초도면과 Component를 호출하여 조립도면을 생성하는 Assembly Drawing Engine을 가진다.

조립 조건, 조립 순서, 주의사항, 치수 관계, Design Tool, Macro를 데이터로 관리한다.

AI는 도면을 직접 임의 수정하지 않고, Macro 또는 Drawing Command를 생성/제안한다.

## 이유

CTO/ETO 업무에서는 제품 선택에 따라 조립도, 제작도, 승인도, 기술자료가 자동 생성되어야 한다.

모든 도면을 원본 CAD 수준으로 직접 수정하면 시스템이 무거워지고 위험해진다.

따라서 조립도면은 목적에 따라 Web Preview, PDF, SVG, DXF/DWG, STEP, glTF 등으로 분리 생성한다.

## 원칙

- 기초도면은 HierarchyAssetLink로 호출한다.
- 조립 조건과 치수 관계는 데이터로 관리한다.
- AI는 제안하고, 검증된 엔진이 실행한다.
- 제조용 핵심 도면만 원본 CAD 동일성을 엄격히 유지한다.
- 3D는 CAD 원본과 Digital Twin 시각화 모델을 분리한다.

