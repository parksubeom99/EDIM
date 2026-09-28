# ADR — 설계 결정 기록

'왜 이렇게 만들었나'를 코드 밖에서 남긴다. 각 ADR 은 상황 · 결정 · 대안 · 얻은 것 · 치른 것 · 검증으로 쓴다.

| # | 결정 | 상태 |
|---|---|---|
| [001](ADR-001-code-driven-bom.md) | BOM 은 코드 관계에서 산출하고, 저장은 스냅샷으로만 | 확정 (2026-07-06) |
| [002](ADR-002-deterministic-runtime.md) | LLM 은 빌드 타임 번역기, 런타임은 결정론 | 확정 |
| [003](ADR-003-immutable-snapshot.md) | 산출물은 스냅샷만 읽고, 발행 · 발주는 DB 가 잠근다 | 확정 (P6 · 0010 · 0011) |
| [004](ADR-004-rls-tenant-isolation.md) | 회사 격리 = PostgreSQL RLS ENABLE + FORCE | 확정 (0002) |
| [005](ADR-005-admin-user-db-separation.md) | 관리자 DB① / 사용자 DB② 를 DB 역할로 분리 · 역류 차단 | 확정 (P3-a · 0007) |
| [006](ADR-006-append-only-revision.md) | 코드 개정은 append-only (DB 권한) | 확정 (0005 · 0003) |
| [007](ADR-007-pure-engine-packages.md) | 순수 엔진 패키지와 어댑터 분리 | 확정 (07-02 모노레포) |
| [008](ADR-008-production-mode-gate.md) | 운영 모드 e2e 를 머지 게이트에 | 확정 (2026-09-27) |
| [009](ADR-009-business-date.md) | '오늘'은 회사 시간대 한 곳에서만 | 확정 |
| [010](ADR-010-auth-scrypt.md) | 비밀번호 = Node 내장 scrypt · SSO 는 자리만 | 확정 (0032) |
| [011](ADR-011-learning-ai-level1.md) | 학습 AI 1수준 = 결정론 공식 탐구 + 사람 승인 라벨 | 진행 중 (2026-09-29) |
