# 다음 세션 인계 노트 (nmd) — 2026-09-22 (b) · feat/dims-snapshot 머지 승인 대기

## 0. 시작 전에 읽을 것
1. 프로젝트 메모리 4종 · `docs/04-decisions/2026-09-19-business-architecture-ledger.md`(끝에 09-22 결정)
2. `docs/plan/connection-ledger.md` 끝 네 절(0011 · F · 사양 이관 · Arrangement 1차)
3. 설계 코퍼스 `docs/00-corpus/design-md/` (85md, 09-22 보존) · Arrangement 는 `EDIM_ARRANGEMENT_SETUP_DRAWING_VIEW_MODEL.md`

## 1. 지금 상태 (실측 · 엘 샌드박스)
- **main = `666e1fe`** (P6 followup + 코퍼스 85md 까지 머지됨).
- **브랜치 `feat/dims-snapshot` = `6e1a5ed`** (원격 일치) — **main 머지는 회장님 승인 대기**. 커밋 4:
  - `0011` 치수를 스냅샷에 → 도면은 스냅샷 치수만, 09-21 지문 가드 제거, 옛 스냅샷 재생성 422
  - `F` 개정 = A~F 전체 코드 → F 붙은 실행도 근거 개정 추적, 미저장 F 조합은 빈 값
  - 사양 참조 이관 → 패널·댐퍼·코일 사양이 `dim.W/H` 를 읽음(`cap.face` 열 유지)
  - Arrangement 1차 → 구획 길이(len) 편집·저장·도면 반영, Design 탭 버튼 실동
- 실측: typecheck 11 · 단위 205 · DB 검증 9종 전부 PASS(hierarchy·macro 포함) · **e2e 116/116** · bom-code 18 · drawing 18

## 2. 회장님 결정 대기
1. **`feat/dims-snapshot` 머지** (main=666e1fe 위 ff 가능)
2. Arrangement **2차**(코퍼스 MVP): 방향(L0~R270) · Component 배치 규칙 · 2D 3각법(Front/Top/Right) · 3D View · Design Tool Binding. 지금 버튼 중 Move/Delete/Add/DWG/View/Free CAD 는 여전히 자리만.
3. 70장 판정 조정 · D5 발표 시점

## 3. 엘이 이어서 할 수 있는 것
- 70장 대조 보고서·DEMO 장면 9 를 0011·F·사양·Arrangement 반영본으로 재생성(이번엔 수치만 116 갱신, 화면·근거 미갱신)
- P3-b 학습 1수준(회장님 DXF 연구 후) · P3-c Special 슬롯(사장님 D1 후) · 실 표 바인딩(회사 실 단가)
- e2e 캡처 6장 스크립트 복원(00·05·06·47·48·49 는 docs/screens 발행본으로 보충 중)
- Arrangement 2차(회장님 결정 후)

## 4. 회장님 몫 (Windows PC)
`git pull` → `pnpm db:generate && pnpm db:migrate` → **`pnpm --filter @edim/db seed:catalog`(사양 이관·구획으로 카탈로그 바뀜)** → DEMO §1 → 116/116 · CI 배선 · API 키 Prompt 1회 · 회사 실 표 · DXF 연구 결과 · (사장님) D1

## 5. 정직 고지
Windows 실행 0회 · 단가 샘플 · Prompt→Macro 실모델 0회 · 배포 0회 · 도면은 선과 글자 · Arrangement 는 길이만(방향·배치·3D 미착수) · 매크로 개정 표기는 DB 조회로 확인

## 6. 이번 세션 엘의 실수 (반복 금지)
- S30b2 단언을 H=W 로 가정해 틀림 → 구조 아닌 단언을 고침
- S31g 화면 저장 잔재를 고정 sleep 으로 되돌리려다 뒤 API 단계 오염 → **화면 되돌리기는 API 로 확정**(09-21 고정 sleep 실수의 재발)
- S16a 고정 sleep 재발(첫 컴파일 4초 > 2.5초) → 상태 대기로 교체

## 7. 샌드박스 재개 절차
지난 노트와 동일. 브랜치 `feat/dims-snapshot`. e2e 116/116. 카탈로그 바뀌었으니 재개 시 `pnpm db:seed && pnpm db:seed:demo` 후 검증.
