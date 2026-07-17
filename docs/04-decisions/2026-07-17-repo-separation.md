# 2026-07-17 — 저장소 분리 (P0.5)

## 무엇을 정했나

`edim` repo를 `elevator-cad`로 개명하고, EDIM 플랫폼용 새 repo `EDIM`(Private)을 만들었다.

## 왜

한 이름 `edim`이 서로 다른 두 프로젝트를 가리키고 있었다.

- 깃허브 `edim` = **엘리베이터 CAD** (IFC/DXF → parametric DB, Python, main 26커밋)
- 그 위에 얹힌 PR #13~#22 = **EDIM 플랫폼** (TypeScript 모노레포)

2026-07-16 밤, 이 이름 충돌 때문에 "main이 Python/IFC 프로토타입"이라는 보고가 나왔고 작업이 통째로 어긋났다. 이름이 같으면 사람도 에이전트도 계속 헷갈린다. 재발 방지가 분리의 유일한 목적이다.

## 실측 근거 (2026-07-17)

| 항목 | 실측 |
|---|---|
| `edim` 설명 | "Elevator CAD (IFC/DXF) -> parametric DB..." — 엘리베이터 확정 |
| `edim` main | 26커밋, 전부 Python (extract_ifc · paramdb · propagate · regen_ifc 등) |
| repo 이름 대소문자 | **미구분 확인** — `gh repo view .../EDIM`이 `edim`을 반환. 개명이 생성보다 반드시 먼저 |
| OPEN PR | **10건** (#13~#22). 엘 스냅샷의 7~8건은 오래된 값 |
| 전 PR merge-base | **동일 `121affe`** = main 끝(PR #12 머지). TS 작업이 엘리베이터 이력 26커밋 위에 얹혀 있음 |
| TS 변경 범위 | **9/10 브랜치가 `edim/` 폴더 밖을 전혀 건드리지 않음** (#20만 예외, 문서 8개) |

## 결정 1 — 엘리베이터는 보존

삭제·아카이브하지 않는다. 이름만 `elevator-cad`로 바꾸고 Public을 유지한다. PR 10건도 그대로 둔다.
근거: CTO 프로젝트나 EDIM에 나중에 도움이 될 수 있다는 판단.

## 결정 2 — 이식은 A+ (subtree split)

TS 작업 전체가 `edim/` 한 폴더에 갇혀 있고 엘리베이터 Python 파일과 같은 파일에서 섞인 곳이 없다.
따라서 `git subtree split --prefix=edim`으로 **TS 커밋 이력을 보존한 채 엘리베이터 커밋 26개를 0건으로 떨어낼 수 있다.**

검토했던 대안:
- **B (파일만 추출 재커밋)** — 가능하지만 TS 작업 이력이 날아간다. A+가 되므로 불채택.
- **C (백지 시작)** — 살릴 값어치가 있음이 실측으로 확인돼 불채택.

이식 대상은 PR **#22** (`nightrun/edim-integration-20260716`). 브랜치 10개를 충돌해소까지 마쳐 합쳐놓은 통합본이라, 이것 하나만 split하면 된다.

## 결정 3 — 공개/비공개

엘리베이터 · 병원 · 주식만 Public, 나머지 Private.
**실측 결과 이미 그 상태였다** — `elevator-cad` · `stockproject` · `hospitalMSA`만 Public, 나머지 6건 Private. 조치 없음.

EDIM은 Private. 코드 체계가 사업의 해자이므로 공개하지 않는다.

## 인계된 미해결 경고 (PR #20 진단 보고서에서)

이식 후 반드시 잡아야 하는 것:

1. **TS 테스트 ~94개(vitest)가 CI에 배선돼 있지 않다.** CI가 Python 루트만 커버한다.
2. **verified-green = 0.** 통과가 확인된 테스트가 현재 하나도 없다.
3. AI STEP 6~7 (실데이터 실행 고리)이 공백이다.
