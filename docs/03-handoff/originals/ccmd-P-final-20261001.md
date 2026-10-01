ccmd P — EDIM 최종 마감 청크: L 통합 머지 · 판정 일관화 · 전체 점검 + 재확인(2회) · 태그 (엘 → CC · 2026-10-01)

인계 근거: lmd N(lmd-N-L-finish-20261001.md) 엘 판정 · 완주 설계안(09-28) · 완료 정의 SSOT(docs/04-decisions/2026-09-28-completion-definition.md)
작업 위치: 회장님 PC C:\dev\EDIM (저장소는 공개 상태)
이 청크가 EDIM 의 마지막 구현 청크다. 끝나면 남는 것은 회장님 몫(시연 영상 촬영 · 포트폴리오 PDF)뿐이어야 한다.

---

## 회장님 승인 범위 (이 파일을 CC 에 넘기는 것 = 아래 승인)

| 항목 | 승인 내용 |
|---|---|
| A-1 | PR #5(parksubeom99/EDIM#5) 머지 — 머지 게이트 통과 시 ff 머지 |
| A-2 | 이 청크의 정리 PR(새 PR #6 예상) — 머지 게이트 통과 시 CC ff 머지(ccmd D 머지 위임 상속) |
| A-3 | 반쪽 worktree 폴더 2개(k-c-cad1 · kc-cad1-work) — **압축 보관 후** 삭제(STEP 6-2, 3단 확인) |
| A-4 | 최종 시연 태그 annotated 1개 push(STEP 6-3) |
| A-5 | 회장님 PC main 체크아웃(C:\dev\EDIM) fast-forward — 작업 트리가 깨끗할 때만 |

승인 밖(하지 않는다): force push · 이력 재작성 · 브랜치/태그 삭제 · 저장소 공개 설정 변경 · 새 마이그레이션 · 새 의존성 · 시연 수치 변경.

---

## §0. 엘 판정 — lmd N (CC 와 공유할 사실)

엘 교차검증 PASS(재계산으로 맞은 것):
- 단위 355 = 60+15+18+54+19+13+176 · M-2 347 + 1+1+4+2 와 일치
- 개발 e2e 384 → 402 = 늘어난 단계 18개(S41s · S76f · S80e · S83a · S83b · S84a · S84b · S85a~d · S86 · S87 · S88 · S89 · S90 · S91a · S91b) 목록과 정확히 일치
- 킷 e2e 399 = 402 − host-only 3(S76d · S79d · S80c)
- DB 검증 13종 = 12종 + mes(26/26)
- 판정 46 + 5 + 0 + 19 = 70 · 실동 46 = 42 + 4쪽(p42 · p43 · p44 · p69) · 샘플 7 = 3 + 4
- 볼륨 36 → 38 → 36 · 시연 수치(원가 ₩15,487,170 · 견적 ₩17,035,887) 불변 단언 유지

엘이 직접 실측하지 못한 것(정직 표기): 엘은 이번에도 회장님 PC · 저장소를 실행하지 못했다. 위 PASS 는 lmd 숫자끼리의 정합 검증이다. 그래서 이 ccmd 의 STEP 5 · 7(전체 점검 · 재확인)을 **CC 실측으로 두 번** 받는다.

엘이 고칠 것으로 판정한 것:
1. **판정 기준 불일치** — p58 은 "Free CAD 하나가 없어서 부분"인데, p42(3D 2D CAD Mapping 없음) · p44(공정비용 없음)는 실동으로 올라갔다. 같은 잣대가 아니다. → STEP 2 에서 규칙 R 하나로 다시 판다.
2. **QR 주소 수리의 뒷면** — publicOrigin() 이 EDIM_PUBLIC_URL 이 없을 때 Host 헤더를 믿는다. 공개 배포에서 위조된 Host 로 인쇄본 QR 주소가 바뀔 수 있다. → STEP 4-2 에서 운영 기본값을 EDIM_PUBLIC_URL 로 고정.
3. **ccmd 원본 보관** — ccmd L 원본이 Downloads 에만 있었다. → STEP 6-1 에서 ccmd · lmd 원본을 저장소에 보관.
4. **엘 ccmd N 결함 자인** — N 의 "신규 마이그레이션 금지"와 L 본체(새 표)가 충돌했다. CC 가 멈추고 물은 처리가 맞았다. 이번 ccmd 는 아래 §1 상속 규칙에서 충돌을 미리 풀었다.

lmd N §8 질문 4개에 대한 답:
| 질문 | 답 |
|---|---|
| p44 공정비용 | (d) 새 표 · 원가 변경 없이 **'공정비용(참고)' 줄**로 화면에 낸다(PCR 참고 줄과 같은 방식) → 그다음 규칙 R 로 판정 |
| p42 3D 2D CAD Mapping | (b) **부분** — 규칙 R(필요한 입력: 3D 모델 · CAD 규칙). 단, STEP 2 항목 대조 결과로 최종 확정 |
| 반쪽 폴더 2개 | (b) 이번 청크에서 CC 가 지운다 — 압축 보관 후(되돌릴 수 있게) |
| 시연 태그 | (a) 모든 머지 · 재확인 2회 통과 뒤 CC 가 annotated 태그 push |

---

## §1. 상속 규칙 (ccmd L · N · O · P 가 겹칠 때 어느 쪽이 이기나)

| 항목 | ccmd L | ccmd N | ccmd O | **ccmd P (이번 · 이긴다)** |
|---|---|---|---|---|
| 새 마이그레이션 | 0038 · 0039 허용 | 금지(회장님 결정으로 L 허용) | — | **금지.** 0039 가 마지막. 필요해 보이면 그 항목만 FAIL 로 보고 |
| 새 의존성 | QR 1개 | — | — | **0개** |
| 시연 수치 | 보호 | 보호 | — | **보호**(STEP 5-6 앵커 8개) |
| README | 수치 현행화 | 수치 현행화 | **설계 원칙 절**(내용 SSOT) | O 의 내용 + P 의 최종 수치. 내용이 겹치면 O 가 이긴다 |
| 머지 | 묶음마다 ff | PR 대기 | — | 위 A-1 · A-2 |
| 삭제 | 볼륨 1개 | 보고만 | — | A-3 만(압축 보관 후) |

---

## §2. 하드 가드 (위반 = 그 STEP FAIL · 다음 STEP 으로)

1. main 직접 커밋 금지. 새 작업 브랜치 = `docs/p-final`(STEP 1 머지 후 main 위). force push · 이력 재작성 · 브랜치/태그 삭제 금지.
2. 새 마이그레이션 0 · 새 의존성 0 · lockfile diff 0.
3. 시연 수치 8개(STEP 5-6) 불변 — 기존 e2e 단언이 그대로 PASS 해야 한다.
4. 런타임 LLM 호출 0 · 날짜는 `app/lib/today.ts` 만.
5. Windows 교훈(Gate 4-L): 서버는 분리 프로세스 · PID 로 종료(자기 셸이 걸리는 pkill -f 금지) · 매 e2e 새 서버 · 끝나면 남은 node 를 명령줄(작업 경로)로 확인해 정리 · 파이썬 쓰기 `encoding="utf-8", newline="\n"` · 고정 sleep 금지 · 60줄 넘는 스크립트는 heredoc 금지(파일로) · 커밋 전 `crlf_count.py` = 0 · CMD 줄에 '#' 주석 금지.
6. 비밀값: 커밋 전 `git diff --cached` 비밀값 grep 0.
7. 외부 입력이 필요한 것은 지어내지 않는다: "아직 없음 — 필요한 입력: …".
8. 판정은 엘의 몫 — CC 가 쓰는 판정 칸은 "CC 초안"으로 표기(단, STEP 2 규칙 R 의 기계적 적용 결과는 그대로 적는다).
9. 막히면 그 항목만 FAIL · 마지막 PASS 위에서 다음 항목.

**머지 게이트(이 청크 공통):** typecheck 0 오류 · `pnpm -r test` 전부 · `pnpm db:reset:demo` 후 DB 검증 13종 전부 · reset 후 e2e 2회(개발 1 + 운영 1: `pnpm --filter @edim/web build` → `start`) · 운영 e2e 중 `pg_stat_activity` 최대값 기록 · `--check` EXIT 0 · `crlf_count.py` = 0 · 비밀값 grep 0 · PR CI 초록.

---

## STEP 0 — 실측 대조표 (환경 · 시간 · 식별자)

기대값은 lmd N 기준이다. **현장 실측이 우선**이며, 다르면 실제 값을 적고 이어간다.

명령(그대로):
```
git -C C:/dev/EDIM status --short
git -C C:/dev/EDIM log --oneline -1
git -C C:/dev/EDIM worktree list
git -C C:/dev/EDIM fetch --all --prune
git -C C:/dev/EDIM log --oneline -3 origin/main
gh repo view parksubeom99/EDIM --json nameWithOwner,visibility,defaultBranchRef
gh pr list --repo parksubeom99/EDIM --state open
gh pr view 5 --repo parksubeom99/EDIM --json state,mergeable,mergeStateStatus,headRefName,headRefOid
gh pr checks 5 --repo parksubeom99/EDIM
```

| 축 | 확인 | 기대 | 다르면 |
|---|---|---|---|
| 식별자 | 저장소 nameWithOwner | parksubeom99/EDIM · PUBLIC | 중단 · 보고 |
| 시간 | origin/main | 733015e | 실제 값 기록 후 STEP 1 의 ff 가능 여부로 판단 |
| 시간 | PR #5 | OPEN · MERGEABLE · head = feat/n-l-finish | 이미 MERGED 면 STEP 1 건너뜀(기실행 — H-30) |
| 시간 | PR #5 CI | pass | 실패면 로그 원문 회수 → 원인 수리 커밋은 feat/n-l-finish 에 · 2회 실패면 FAIL 보고 |
| 환경 | 회장님 main 체크아웃 | f369926 · 작업 트리 깨끗 | 깨끗하지 않으면 A-5 건너뜀(건드리지 않음) |
| 환경 | ccmd O 실행 여부 | `git -C C:/dev/EDIM log origin/main --oneline --grep "ccmd O"` 와 README 의 설계 원칙 절 유무 | 둘 다 없음 = 미실행 → STEP 3 에서 수행 |
| 환경 | ccmd · lmd 원본 위치 | `C:\Users\psb\Downloads` 의 ccmd-*.md · lmd-*.md 목록 | STEP 6-1 보관 대상 목록으로 씀 |

PASS 조건: 표 7행 실측값이 모두 적혀 있다(기대와 같은지 여부와 무관).

---

## STEP 1 — PR #5 머지 (A-1) + 머지 후 재검증

1. PR #5 head 위에서 머지 게이트 전부(위 §2). lmd N 에서 이미 돌렸더라도 **CI 결과는 이번에 확인**한다.
2. 통과 → `main` 을 PR #5 head 로 ff 머지 · push(lmd N 과 같은 방식). 머지 커밋 · 스쿼시 금지.
3. 머지된 main 에서 다시: typecheck · 단위 · DB 13종 · 개발 e2e 1회 · `--check`.
4. A-5: 회장님 main 체크아웃이 깨끗하면 `git -C C:/dev/EDIM pull --ff-only`. 깨끗하지 않으면 손대지 않고 보고.

[자가검증] 성공: `git rev-parse origin/main` = PR #5 head · 재검증 전부 PASS · `gh pr view 5` = MERGED.
실패 진단: ff 불가면 origin/main 이 그사이 움직인 것 → rebase 하지 말고 두 해시를 보고하고 중단.

---

## STEP 2 — 판정 일관화 (규칙 R) · 브랜치 `docs/p-final`

### 2-0. 규칙 R (이번에 엘이 확정 — 생성기 머리 주석과 page-map 머리에 그대로 적는다)

```
R1. 청사진 쪽의 원문 항목을 전부 열거한다.
R2. 항목마다: 있음(화면 경로 + e2e 단계 ID) / 없음 / 확장(회장님 확정 확장 목록).
    확장 목록 = AR · XR · 증강 현실 · Digital Twin · Smart Factory · 실시간 설비 데이터 · 파트너 외부 로그인 포털
R3. '없음'이 0 이면 실동(샘플 자료면 실동(샘플)) · '없음'이 1 이상이면 부분 · 화면 0 이면 미착수.
R4. 판정 칸 옆에 '없음' 항목과 "필요한 입력: …"을 적는다.
```

### 2-1. p44 공정비용(참고) — 새 표 · 원가 변경 없이

- 시간당 공정 요율은 **파일**에서 읽는다: `packages/bom-code/cost-rules` 의 기존 요율 파일 형식을 따라 샘플 행 하나(예: 작업장별 시간당 요율, '샘플' 표지). 파일만 바꾸면 값이 바뀌어야 한다(완료 정의 ④ 와 같은 방식).
- 계산: 작업지시의 공정 단계마다 시간 × 인원 × 수량 × 요율 → 합. 결정론 · 단위 테스트 1개 이상.
- 표시: `/m/work-orders` 상세와 A4 작업지시서에 **"공정비용(참고 · 원가 미반영)"** 줄. 원가 · 견적 · PCR 계산 경로는 이 값을 읽지 않는다(하드 가드 3).
- e2e 1단계: 참고 줄이 보이고, 그 화면 이후에도 원가 ₩15,487,170 · 견적 ₩17,035,887 이 그대로.

### 2-2. 새로 연 4쪽 항목 대조표 (규칙 R 적용)

원문 항목(엘이 EDIM.pdf 원문에서 뽑은 목록 — 빠진 것이 보이면 추가하고 보고):

- **p42**: Material management(Sub Material List · Variant List · 3D 2D CAD Mapping · Inventory Management) · 치수표(Dim · 설계 우선순위 · 상위설계 우선자료 · **설계 기준점 설정** · 설계 오류 체크 · Remarks) · Item List(Assembling · Bolt & Nut) · Data Up-Load(Table · Data · File · Image) · Edit Table · Coding List · Schedule management · Sub Item list
- **p43**: Material 표(Item · warehouse · Min Stack · 공급자 · 제조/구매 · Time) · Process 표(Assembling · Work shop · Work place · Person · Skill · W. Time)
- **p44**: 생산계획(MRP · Scheduling · Capacity) · 작업지시(양식 · 단계별 진행 기록) · 공정관리(작업장 · 기계 · 인원 · 필요 스킬 등급 · 작업 시간 · 조립 공정 · 전후 공정) · 자재흐름(물류 창고 · 물류 방식) · 원가(자재 단가 · 인건비 · 공정비용) · 품질(제품 검수 · 하자 관리) · 구매 관리(공급처 국가/본사 · 납기 · 납품 조건 EXW/FOB/CIP · 운송 · 사용자용/공급자용 제품코드 · 복수 단가 · 지불조건 · 화폐 · 물품 형식 · 최소 구매수량 · 인증서 여부 · 단위) · 자재 생산 계획 · 창고관리(자재 분류 · 자재 물성 · 저장 위치 · 보관 품질 · 입출고 기록 · 재고 단가 최고/최저/평균/최근) · 재고관리(적정 재고량 · 유통기한) · 기타(불량품 · 폐품 처리 · 표준화 · 대체 자재 · 외주)
- **p69**: 업무 승인 · 업무 소통 · 자재 입출고 · 검수(자재 · 완성품 · 설치완료) · 유지보수 · 증강 현실(확장) · 공지 · QR(도면 · 각종 서류 · Project History · Project 정보 · 처리해야 할 업무)

각 항목: 있음이면 화면 경로 + e2e 단계 ID, 없음이면 "필요한 입력". 기존 기능이 그 항목을 덮으면(예: 구매 요청 · 공급처 화면이 p44 구매 관리 일부를 덮음) **그 화면 경로를 적고 있음**으로 셈한다. 덮는지 애매하면 '애매'로 적고 엘에게 넘긴다(임의로 있음 처리 금지).

### 2-3. 나머지 실동 쪽 근거 재확인 (기계적)

생성기의 실동 · 실동(샘플) 쪽마다 근거 칸에서 e2e 단계 ID(정규식 `S[0-9]+[a-z]?`)를 뽑아:
- 그 ID 가 `scripts/demo_e2e.py` 에 존재하는가
- STEP 5 최종 실행에서 PASS 했는가
근거 ID 가 하나도 없는 실동 쪽은 **판정을 바꾸지 말고** 목록으로만 보고(엘이 판정).

### 2-4. 생성기 반영

규칙 R 결과를 생성기 judge/why 칸에 넣고 `--check` EXIT 0 · page-map 재생성. 기대(엘 예측 — 실측이 이긴다): p42 부분 · p44 는 2-2 결과에 따름 · p43 · p69 실동(샘플) · p58 부분. 합계가 70 인지 확인.

[자가검증] 성공: 4쪽 항목 대조표가 lmd 에 있다 · 판정 합계 70 · `--check` EXIT 0 · 2-3 목록 첨부.

---

## STEP 3 — ccmd O (README 설계 원칙 절) — STEP 0 에서 미실행일 때만

- 회장님이 ccmd O 파일(ccmd-O-*.md)을 함께 주셨으면 **그 파일이 SSOT** 다. 그대로 수행한다.
- 파일이 없으면 아래 요지로 수행하고, lmd 에 "ccmd O 원문 없이 요지로 수행"이라고 적는다.
  1. README 에 **설계 원칙** 절. A1~A7(원자 컴포넌트)마다 구현 상태를 저장소 실측으로 3갈래 판정: **구현됨**(경로 · 테스트) / **폴백 동작**(AI 키 없을 때 결정론 폴백 — D-6) / **설계만**(문서 경로).
  2. AI 서술: "런타임에 AI 가 없다"로 쓰지 않는다. **"AI 의 약점(재현성 · 환각)이 드러나는 자리는 결정론으로 대체했고, AI 가 강한 자리(자연어 → Macro 번역 · 학습 제안)는 적극 썼다"**로 쓴다. 같은 사실, 다른 프레임.
  3. 계층 용어: **플랫폼 관리자 / 회사 관리자 / 사용자** 셋으로 통일(고객 · 본사 표현 금지).
  4. 쓰면 안 되는 주장: "DWG 를 DXF 로 변환했다"(하지 않았다). 맞는 말 = 데이터 모델 직접 정의 · DXF 를 코드로 직접 생성(6종) · 생성한 DXF 를 되읽어 뷰 간 치수 일치 자동 검증.
  5. 한정어 '샘플 데이터 기준'은 절대 빼지 않는다. 약점 목록을 첫 화면에 따로 진열하지 않는다(회장님 결정).
- 검증 숫자는 STEP 5 2회차 최종값으로 README · 배지 · 테스트 표를 맞춘다.

---

## STEP 4 — 마감 정리 3건

### 4-1. 작업지시 화면 — 완료된 공정의 착수 · 완료 버튼
완료된 단계에서는 버튼을 숨긴다(서버 409 는 그대로 둔다 — 화면만). e2e 1단계: 완료 단계에 버튼 0개 · 강제로 API 를 부르면 여전히 409.

### 4-2. QR 공개 주소 — 운영 기본값 고정
- 운영 모드(`NODE_ENV=production`)에서 `EDIM_PUBLIC_URL` 이 있으면 그것만 쓴다(Host · x-forwarded-* 무시).
- 운영 모드인데 없으면: 지금처럼 Host 로 폴백하되 서버 시작 시 경고 1줄 로그 + DEPLOY.md 에 "공개 배포에서는 EDIM_PUBLIC_URL 필수 — 없으면 QR 주소가 요청 Host 를 따라간다".
- 킷(docker compose)과 `.env.example` 에 `EDIM_PUBLIC_URL=http://localhost:3000` 기본값.
- e2e: 킷에서 S90 의 "QR 주소 = 사용자가 연 주소" 단언 유지 + 운영 모드에서 위조 Host 헤더로 인쇄본을 요청해도 QR 주소가 EDIM_PUBLIC_URL 인지 단언 1개.

### 4-3. 화면 캡처 발행본 현행화
`docs/screens/`(README "전체 68장")를 최종 e2e 캡처에서 다시 발행(`scripts/publish_screens.py`). README 의 장수 · 갤러리 링크를 실제 파일 수와 맞춘다. 캡처 원본(shots)은 저장소 밖 그대로.

[자가검증] 성공: 세 항목 각각 e2e 단계 ID · diff 경로가 lmd 에 있다.

---

## STEP 5 — 전체 점검 (1회차) — 머지 전, `docs/p-final` head 에서

이 STEP 이 "전체를 점검하고 다시 확인"하는 본체다. 항목마다 **명령 · 출력 원문 마지막 줄 · PASS/FAIL** 을 lmd 표로.

### 5-1. 전수 재측정
`pnpm install` · `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:reset:demo` · typecheck · `pnpm -r test`(패키지별 개수) · DB 13종(종목별 마지막 줄) · 개발 e2e · 운영 e2e(`pg_stat_activity` 최대) · `--check`.

### 5-2. 완료 정의 4항목 대조
| # | 완료 정의 | 증명 방법 |
|---|---|---|
| ① | 51쪽 전부 화면에서 돌고 e2e 증명(외부 자료 쪽은 실동(샘플)로 셈) | STEP 2 판정표 · 2-3 근거 대조 |
| ② | 5구역 + ※③ 한 흐름 · 연결 장부 '없음' 0 | 연결 장부 실측 이어짐 · 약함 · 없음 |
| ③ | 공개 저장소 README · CI 초록 · docker 한 줄 | **새 폴더에 공개 원격을 fresh clone** → README 에 적힌 docker 한 줄 그대로 실행 → 킷 e2e(host-only 표시) · `gh run list --branch main --limit 3` |
| ④ | 실자료는 파일 교체만으로 반영 | S80c(호스트) 단계 PASS + 이번 2-1 공정 요율 파일 교체 전후 값 변화 1건 |

③의 fresh clone 은 `C:\dev\EDIM` 이 아니라 새 임시 폴더(예: `C:\dev\EDIM_verify_clone`)에서 한다 — 회장님 작업본을 건드리지 않고 "남이 받아서 돌리면 되는가"를 증명하는 것이 목적이다. 끝나면 그 폴더의 compose 를 내리고 볼륨을 지운 뒤(이번에 만든 이름만 · before/after 볼륨 목록 diff 첨부) 폴더를 지운다(이 폴더는 이번 STEP 이 만든 것이라 승인 범위 안).

### 5-3. 문서 정합 — 낡은 숫자 grep (스크립트로 · 파일 `scripts/check_stale_facts.py`)
현재 사실(SSOT = `docs/03-handoff/cp4-facts-20261001.md` 최종판)과 다른 옛 값이 **현재 상태를 말하는 문장**에 남아 있는지 찾는다.
- 찾을 옛 값(예): `384/384` · `383` · `381` · `371` · `단위 347` · `단위 346` · `12종` · `DB 검증 9종` · `42 · 5 · 4` · `38 · 9 · 4` · `46 · 5 · 0`(STEP 2 로 바뀌면) · `미착수 4` · `68장`(4-3 이후) · `견적=원가`
- 대상: README · docs/DEMO.md · DEPLOY.md · docs/plan/connection-ledger.md · CI 워크플로 주석 · docs/00-corpus/page-map.md · docs/screens 안내
- 제외(역사 기록이라 옛 값이 맞음): `docs/03-handoff/` · `docs/04-decisions/` · changelog · troubleshooting 사례 · ADR 의 날짜 붙은 기록
- 히트마다 파일:줄 · 앞뒤 문맥 · 조치(고침/역사라서 둠). 스크립트는 저장소에 커밋해 다음에도 쓴다.

### 5-4. 링크 검사
README · docs 아래 md 의 상대 링크 · 이미지 경로가 실제 파일로 풀리는지(스크립트). 깨진 링크 0.

### 5-5. 비밀값 — 전 이력 스캔 (공개 저장소라 필수)
`git log -p --all` 전체에서 패턴: `ghp_` · `github_pat_` · `sk-ant-` · `AKIA` · `-----BEGIN` · `password=` · `DATABASE_URL=postgres` 중 실제 값처럼 보이는 것. `.env` 계열이 추적되지 않는지(`git ls-files | grep -i env`). 히트 0 이어야 PASS. 히트가 있으면 **고치지 말고**(이력 재작성 금지) 위치만 보고하고 중단 — 회장님 · 엘 판단.

### 5-6. 시연 수치 앵커 8개 (e2e 단언 ID 와 함께)
매크로 455.4 · BOM 11행 · 원가 ₩15,487,170 · 견적 ₩17,035,887 · 회귀 1,200 · 스냅샷 원가 기준 이익 1,548,717 · Own acc. EBIT 2,193,185 · 파일 교체 원가 증가 2,378,880. 각 값을 단언하는 e2e 단계 ID 와 PASS 를 표로. 단언이 없는 값이 있으면 그 값만 보고(새로 만들지 말고 — 엘 판정).

### 5-7. 경계 재확인
`edim_platform` 이 0038 · 0039 새 표를 읽지 못함 · 다른 회사 0건 · 추가만 표 UPDATE/DELETE 거부 — mes:test · platform:test · rls:test 해당 단언 이름과 PASS.

### 5-8. 저장소 위생
open PR 목록 · `git branch -r --merged origin/main` · `git worktree list` · main 체크아웃 미추적 파일 · `crlf_count.py` · `.gitignore` 에 `.env` · shots 포함 여부.

[자가검증] 성공: 5-1~5-8 표 전부 채워짐 · FAIL 은 원인 한 줄 + 고친 커밋(고칠 수 있는 것) 또는 보고(고치면 안 되는 것).

→ 1회차가 PASS 면 `docs/p-final` push → PR 생성 → CI 초록 → **A-2 ff 머지**.

---

## STEP 6 — 보관 · 정리 · 태그 (머지된 main 위)

### 6-1. ccmd · lmd 원본 저장소 보관 (H-39)
STEP 0 에서 찾은 ccmd-*.md · lmd-*.md(L · M · M-1 · M-2 · N · O · P 와 그 lmd)를 `docs/03-handoff/originals/` 에 원문 그대로 복사 → 비밀값 grep 0 확인 → 문서 전용 커밋. 이미 저장소에 있는 것은 중복 복사하지 않는다(파일명 · 해시 대조). 이 커밋은 `docs/p-final-archive` 브랜치 → PR → CI → ff 머지(A-2 범위).

### 6-2. 반쪽 worktree 폴더 2개 (A-3) — 조회 → 대조 → 실행
1. 조회: 두 폴더의 전체 경로 · 파일 수 · 크기 · `git worktree list` 에 없음을 출력.
2. 대조: 폴더 안에 `.git` 파일이 가리키는 곳 · 저장소 커밋에 없는 파일이 있는지(파일 해시를 `git hash-object` 로 계산해 `git cat-file -e` 로 존재 확인) 목록.
3. 보관: 두 폴더를 `C:\dev\EDIM_shots\archive\worktree-leftovers-20261001.zip` 으로 압축 · zip 안 파일 수 = 1번 파일 수 확인.
4. 실행: zip 확인 후에만 폴더 삭제 · `git worktree prune` · 삭제 뒤 `dir` 로 부재 확인.
경로가 C:\dev\EDIM 아래가 아니거나 이름이 정확히 두 개와 다르면 실행하지 않는다.

### 6-3. 최종 태그 (A-4)
STEP 7 이 PASS 한 뒤에만. 이름 `demo-20261001-final`(날짜는 실행일로) · annotated · 메시지에 main 해시 · 단위 · DB · e2e(개발/킷) · 판정 합계. push 는 그 태그 하나만. 같은 이름이 이미 있으면 만들지 말고 보고.

---

## STEP 7 — 재확인 (2회차) — 최종 main 에서 처음부터 다시

"한 번 통과"를 믿지 않는다. 최종 main(6-1 머지 뒤)에서 **STEP 5 를 처음부터 한 번 더** 돈다: `pnpm db:reset:demo` → 5-1 전수 → 5-2 ③은 fresh clone 을 **다시** 새로 받아서 → 5-3~5-8.
- 1회차와 2회차 숫자 표를 나란히. 다르면 차이마다 원인 한 줄(새 단계 추가 등 설명 가능한 차이만 허용).
- 2회차 PASS → 6-3 태그.
- 2회차 FAIL → 태그 만들지 않고 보고.

---

## STEP 8 — 납품

1. `docs/03-handoff/cp4-facts-20261001.md` 를 **최종판**으로(2회차 숫자 · 판정표 · 완료 정의 4항목 · 태그 해시).
2. lmd P: `lmd-P-final-20261001.md`(Downloads 에도 사본).

lmd P 구성:
1. 한 일(STEP 0~7 한 줄씩)
2. STEP 0 실측표
3. 판정: 규칙 R · 4쪽 항목 대조표 · 2-3 근거 대조 · 최종 실동/부분/미착수/개념 합계(CC 초안)
4. 전체 점검 1회차 · 2회차 숫자 나란히(원문 마지막 줄)
5. 완료 정의 4항목 표(증명 경로)
6. 설계와 다르게 한 곳(이유)
7. 사이드이슈(고치지 않은 것)
8. 회장님 몫 남은 것(엘에게 묻는 것은 선택지로)
9. 내가 한 판정은 '주장'이다

---

## 이 ccmd 뒤 (참고 — CC 작업 아님)
- 엘: lmd P 재판정 → 최종 판정 확정 → CP4 보고(회장님 · 사장님용).
- 회장님: 태그 버전으로 시연 영상 촬영(운영 모드 · 7장면) · 포트폴리오 PDF.
