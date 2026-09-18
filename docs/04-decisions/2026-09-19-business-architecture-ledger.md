# 확정 장부 — EDIM 사업·시스템 구조 (2026-09-19)

> 회장님이 지난 채팅에서 **이미 확정한 것**의 장부. 새로 추론하지 말고 여기서 출발한다.
> 출처: 프로젝트 채팅 34개 대조(2026-09-18~19) + 화이트보드(`full_archtecture.png`) + `edim_ai_deepdive.html`.
> 같은 내용이 Claude 프로젝트 메모리 `business-architecture`에 있다. 메모리 도구가 없는 표면(Claude Code 등)은 이 파일을 본다.

## 1. 경계와 해자
- RCCS는 **우리가 틀을 만들고, 사용자가 수치를 넣어 관계를 만드는** 구조.
- **EDIM Toolbox** — 사용 회사의 내부 개발자가 UI·프로그래밍을 **엑셀 매크로 수준까지** 직접 커스터마이징. EDIM 메인폼과의 호환이 핵심.
- **Special Tool Box** — 매크로·스프레드시트를 넘는 기능·계산(VBA급)은 **우리가 개발해 SI 비즈니스처럼 UI로 제공**, 사용자는 메인폼에서 사용. "AI 미착수 영역"이 아니라 **SI 수익 사업으로 정의된 영역**.
- 사용자가 매크로 이상을 직접 못 만드는 이유 = EDIM에 맞는 **형식과 DB가 정해져 있기 때문**. 해자는 AI가 아니라 형식·DB 소유 + 플랫폼 승인 빗장(EDIM.pdf p44·p54).
- **DB 정렬화**가 바닥: 같은 형식으로 배열 → DB 간 유사성↑ → 흐름·정합성. "DB② ≈ DB①의 90%"는 설계의 결과.

## 2. 화이트보드 5구역
| 구역 | 내용 |
|---|---|
| ※① PLM | code system·Main DB ← code setup / drawing setup ← data |
| CPQ | **함축코드** 산출 — BOM 계층·자재·단가·도면·생산시간·인건비·견적이 코드에 함축. 단가는 각 회사 ERP data |
| ※② EDIM Toolbox | UI 도구(CPQ·ERP·tech 템플릿) + Programming(Native AI + Macro, "엑셀 함수 너머"가 도전 과제) |
| ※③ 관리자 소유 | New SI · AI 학습 · Special program tool. 도면 전문가의 도면 data → 학습 AI(분류·축적·패턴·공식) → DB① |
| ※④ ERP | 함축코드 data를 받아 구매·제작·영업 processing |
| ※⑤ MainForm | 통합 UI — 상단 CPQ/PLM/ERP, 좌 hierarchy 주소, 우 tech·code, 중앙 main work |

## 3. DB①/DB②
- DB① = 관리자 전용 학습 DB(원천자료 → 학습 AI). Special tool과 교류.
- DB② = 사용자(회사 관리자+하부 조직)용 메인 DB. Toolbox(macro AI)가 사용.
- Toolbox와 Special은 **UI 커스터마이징만 공유**. **DB②→DB① 역류 없음**(소유 분리·데이터 주권·멀티테넌트 신뢰).
- 통합 학습 1회 + 이중 프로젝션(π_admin→DB①, π_user→DB②), 구조 유사도 90% 목표.
- Special 셋업에서 AI는 필수 아님 — 결정론 최대, 진짜 새 계산만 build-time LLM 1회 → 승인 → 이후 결정론.

## 4. 권한·사업모델
- 3계층 권한: 플랫폼 관리자(※③ 소유) → 회사 관리자(MainDB 운영·하부 접근 통제) → 하부 사용자.
- 도구 계층 = 요금 계층: macro로 안 되는 계산은 Special + 별도 과금.
- 컨설팅 BM: 메인 DB 분석 기반 최적안 제안 — 내부 최적화 + 익명·집계 벤치마킹 둘 다 채택.
- 셀프서비스("매크로를 줄 테니 직접 만들어라"), 도면 수백만 장 → **마스터 1장 + 치수 전파**.
- 확장(EDIM 완료 후): ERP → Digital Twin/Smart Factory → AR·XR (p4). 산출→학습 "대순환"은 문서 근거 없어 삭제됨.

## 5. 확정된 설계 결정
| 결정 | 날짜 |
|---|---|
| GAP1 = **코드 기반 BOM**. BOM/BOMLine은 BomCodeRun 산출 스냅샷 | 2026-07-06 |
| 모델 소싱 = B 하이브리드(API → 승인 코퍼스 성숙 후 로컬). v1 함수 = IF·Table·Var·PreC·Run + SUM·MIN·MAX·AVG·LOOKUP·ROUND·AND·OR | 2026-07-06 |
| EU/ER/EC = 제품군 접두, 매크로 인자 = 엑셀 문법 예시, 뒷자리 숫자 = 슬롯 선택 순번 | 2026-07-14 |
| **Toolbox = MainForm 옆 별도 플로팅 창**(UI Tool/Program Tool 탭·드래그·도킹·버튼 실시간 동기화) | 2026-07-14 |
| 승인 문서는 개정/잠금 — p24 Revisions + Drawings.status(작성중/검토/승인/발행) | 2026-07-15 |
| **베타 = 얇은 수직 1줄기**(코드 1개 → 실행 → BOM·도면·원가). M1→M2→M3 | 2026-08-17 |

## 6. 2026-09-18 실측 대조 (main a9f81dc 기준)
- 실동: ※⑤ MainForm 5영역·2계층 승인·RLS / ※② Macro DSL·Verify·Registry·EDIM Run / CPQ 1줄기(BOM·EBOM·Cost·DXF 평면) / Revision(append-only).
- **확정 방향 대비 미달**: BOM이 슬롯→규칙 함수(BomCodeRun·Code Relationship 0건) · Toolbox가 탭(플로팅 창 아님) · STEP 5 역번역 0건 · 자연어→Macro 번역 엔진은 있으나 화면 미연결.
- 구현 0: Set-Up 등록 화면(p29–44) · 플랫폼 관리자 계층 · 관리자/사용자 영역 분리 · Special 제공 슬롯 · Drawings.status · 컨설팅 BM.
- 의도된 범위 밖(베타 정의상 정상): CPQ 문서·Print, 구매·공정, Digital Twin.
- 미결: 로컬 전용 88md 코퍼스 보호 백업(2026-08-17부터).
