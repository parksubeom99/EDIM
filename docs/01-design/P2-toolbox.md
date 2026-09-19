# P2 — 청사진대로 Toolbox (플로팅 창 · 역번역 · 흐름도 · 명령 버튼 동기화)

> 점검 초안 · 2026-09-19 · 브랜치 `feat/p2-toolbox` (`feat/p1-code-backbone` 위 적층) · 근거: EDIM.pdf p25 [EDIM Toolbox UI] · p27 [EDIM Toolbar Programing], 회장님 요구(2026-07-14): "별도 플로팅 창 · UI Tool/Program Tool 탭 · 드래그·리사이즈·도킹 · 중앙 작업영역을 가리지 않는 기본 위치 · 명령 버튼이 MainForm과 실시간 동기화". 스키마 변경 없음(Tier A).

## 1. 만든 것
| 청사진 | 구현 | 위치 |
|---|---|---|
| p27 별도 창 [EDIM Toolbar Programing] | `ToolboxWindow` — 플로팅 · 제목줄 드래그 · 모서리 리사이즈 · Dock/Float 토글 · ⌂ 기본 위치 · 열림/위치/도킹 상태 유지 | 툴바 우측 **Toolbox** 버튼 |
| 기본 위치가 중앙을 가리지 않음 | 열 때 **Inspector 열을 실측**해 정확히 그 자리에 놓는다(e2e S13a가 좌표로 검사) | |
| p27 Macro 칸 + Run + 값 | Verify · Save draft · 승인 · **Run** · 결과값 | Program Tool |
| p27 **Description** (Macro → 글) | `describe()` — **STEP 5 역번역**. AST만 읽는 결정론 함수, LLM 아님. 회사 말 이름(용어집) 포함, "읽는 값"(표·변수·코드) 목록 제공 | `@edim/macro-dsl` · `POST /api/macros/describe` |
| p27 **Flowchart** (Macro → 그림) | 같은 AST에서 흐름 트리(IF=판단, 그 외=처리) → 화면 | Program Tool |
| p27 **Prompt** (글 → Macro) | 기존 `compile()`(모델은 제안만, 파싱+정적 검증 통과해야 verified)을 화면에 연결. 모델 미연결이면 **그렇다고 말한다**(가짜 답 없음) | `POST /api/macros/compile` |
| p25 **Commend button set-up** | 명령의 표시 여부·이름·순서를 고치면 Action Bar가 즉시 바뀐다 | UI Tool |
| 명령 버튼 ↔ MainForm 동기화 | Toolbox의 Run은 **Action Bar의 run 그 자체**(runRef). 실행 경로·결과 스트림이 하나라 두 곳 값이 항상 같다(e2e S13e) | |

## 2. 설계 결정
1. **역번역은 실행기의 의미를 그대로 옮긴다.** 이 DSL은 연산자 우선순위가 없고 왼쪽부터 계산한다 → 설명에 괄호로 드러낸다(`1+2*3` → `(1 + 2) × 3`). IF 조건의 코드 여러 개는 "모두". 승인자가 식을 몰라도 **실제 계산되는 것**을 확인하게 하는 것이 목적.
2. **깨진 식은 추측하지 않는다.** 파싱 실패면 설명·흐름도 대신 오류 위치를 보인다.
3. **런타임 LLM 0 유지.** Prompt→Macro는 build-time 제안이고, 승인 전에는 실행되지 않는다. Description·Flowchart·Run에는 모델이 관여하지 않는다.
4. **설정 저장은 브라우저(localStorage)까지만.** 회사 공용(역할별 버튼 구성)은 테이블이 필요(Tier B) — 만들지 않았다.

## 3. 검증 (엘 샌드박스 실측)
typecheck 11 패키지 · 테스트 **166**(역번역 6 추가) · `demo_e2e` **36/36**(P2 11단계: 기본 위치·역번역·흐름도·깨진 식·Run 동기화·Prompt 정직 고지·명령 설정 반영/복원·드래그·도킹·새로고침 유지). 창 캡처 2장 육안 확인(좁은 폭에서 닫기 버튼 잘림 → 수정 후 좌표 검사 통과).

## 4. 아직 아닌 것 (정직 고지)
- **Prompt→Macro는 실제 모델로 한 번도 돌려 보지 못했다.** 샌드박스에 API 키가 없다. 연결 코드·검증 루프는 단위 테스트(스크립트 클라이언트)로만 확인됨. 발표에서 쓰려면 회장님 PC `.env`에 `ANTHROPIC_API_KEY`를 넣고 1회 확인 필요.
- p27의 **Coding(AI)** 칸, **함수 마법사 · 그래프 마법사 · Data Information Call(주소 찾기)** 는 없다. 4-Way Sync 중 **Flowchart→Macro, Description→Macro 방향**(그림·글을 고쳐 식을 바꾸기)도 없다 — 지금은 Macro에서 나가는 방향만.
- p25의 **Combo box set-up macro · Templet · Canvas Drag · UI 개발 AI**는 없다. UI Tool은 명령 버튼 설정 하나뿐.
- **Table 등록**: Set-Up ▸ Product Code ▸ Table이 그 자리다. 2026-09-19 표 모양 통일로 Macro의 `TableN`이 등록 표를 직접 읽는다(P1 기록 §3-c). `Var(NS)`와 코드 이름 용어집만 아직 샘플 상수.
- 흐름도는 상자 배치(CSS)다. 청사진의 도형 팔레트·연결선 편집기가 아니다.
- 창 폭이 Inspector 폭(약 316px)일 때 끌 수 있는 곳은 왼쪽 그립(⠿)과 탭·버튼 사이 틈이다.
- 기존 Macro 탭(`macro-panel.tsx`)은 그대로 둠(e2e S4가 사용). Toolbox와 기능이 겹친다 — 어느 쪽을 남길지는 회장님 결정.
