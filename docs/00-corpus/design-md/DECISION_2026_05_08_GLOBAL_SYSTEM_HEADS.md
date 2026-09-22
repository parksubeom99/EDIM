# Decision: Global and System Heads

Date: 2026-05-08

## 결정

EDIM의 Head에는 CPQ, PLM, ERP 같은 업무 Head뿐 아니라 프로그램 전체에 영향을 주는 System/Admin Head를 포함한다.

초기에는 `System Setup` Head 아래에 전체 관리 기능을 모으고, 향후 기능 규모에 따라 별도 Head로 분리할 수 있게 한다.

## 이유

EDIM은 Head, Hierarchy, Template, Permission, Approval, File, Task, Run Job, Audit Log 같은 공통 구조를 사용한다.

이 기능들은 특정 업무 모듈에 종속되면 안 되고, 전체 시스템 관점에서 관리되어야 한다.

## 원칙

- 모든 Head는 좌측, 중앙, 우측 Template Binding을 가진다.
- System/Admin Head는 권한 있는 사용자에게만 표시한다.
- 관리 기능은 처음부터 확장 가능한 Head/Hierarchy 구조로 둔다.
- 공통 관리 기능이 커지면 독립 Head로 승격할 수 있다.

