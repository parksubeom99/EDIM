# Decision: Mobile Field Work and Project Activity Feed

Date: 2026-05-08

## 결정

EDIM에는 핸드폰 App 기반의 현장 업무 처리 기능과 SNS형 Project Activity Feed를 포함한다.

Mobile App은 자재 입출고, 품질 관리, 설치, A/S, Digital Twin 현장 기록에 사용한다.

Project Activity Feed는 Project와 업무 대상별 기록, 댓글, 멘션, 첨부, 시스템 이벤트를 저장한다.

## 이유

EDIM은 여러 부서와 현장이 연결되는 시스템이다.

업무 진행 중 발생하는 대화, 사진, 품질 기록, 자재 이동, 승인, 변경 이력은 Project History와 업무 개선에 매우 중요한 자료가 된다.

## 원칙

- SNS 기능은 공개형 SNS가 아니라 Enterprise Work Feed다.
- Audit Log와 Activity Feed는 분리한다.
- 모든 Feed와 Field Event는 Tenant/Project/Permission 기준으로 보호한다.
- Mobile App은 이후 단계에서 만들되, Core API와 데이터 구조는 먼저 준비한다.

