# Decision: Task, Schedule, and Dashboard Area

Date: 2026-05-08

## 결정

EDIM 좌측 패널 하단에는 Hierarchy 아래에 사용자 일정, 해야 할 일, 지연 업무, 승인 대기 등을 표시하는 Template 영역을 둔다.

ERP 업무 흐름에서는 전 단계가 완료되면 후속 담당자에게 자동 Task를 생성할 수 있게 한다.

Dashboard에서는 전체 Project 현황과 담당 업무 진행 상황을 표시한다.

## 이유

EDIM은 CPQ, PLM, ERP, Approval, EDIM Run이 서로 연결되는 업무 플랫폼이다.

사용자는 현재 해야 할 일, 밀린 일, 승인 대기, 후속 업무를 항상 확인할 수 있어야 한다.

특히 ERP에서는 업무가 부서 간 단계적으로 넘어가므로 Task 자동 생성과 지연 알림이 중요하다.

## 원칙

- Task/Schedule 영역도 Template으로 호출한다.
- Head별로 다른 Task Template을 사용할 수 있다.
- Task를 클릭하면 관련 Main UI 또는 Right Panel로 이동한다.
- 지연 업무와 승인 대기는 Badge로 표시한다.
- Dashboard는 Project, Department, User, Status 기준으로 집계한다.

