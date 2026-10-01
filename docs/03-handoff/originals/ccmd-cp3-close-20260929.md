# ccmd K-0 — CP3 닫기: 기준선 재측정 · 배포 킷 · 쪽 지도 · 연결 장부 · 시연 대본 (2026-09-29)

> 엘 → CC. 근거: 완주 설계안(09-28 합의) CP3 = "B·C 끝" 판정. 회장님 지시(09-29): "2번 전체 ccmd".
> **이번 밤은 새 기능을 만들지 않는다.** J 결과를 재고, 공개 저장소에 남은 낡은 정보를 고치고, CP3 보고와 촬영에 쓸 재료를 만든다.
> 기대값은 **엘의 09-29 실측 기준**이다. 현장 실측이 우선이며, 다르면 실제 값을 적고 이어간다.
> 머지: ccmd D~J 와 같은 머지 게이트 통과분만 main fast-forward(회장님 사전 승인 상속). 저장소는 **공개** 상태다.
> 판정(청사진 쪽 · 연결 장부)은 **엘의 몫**이다. CC 는 근거를 모아 "CC 주장"으로 적고, 판정 문구를 확정하지 않는다.

---

## 0. 완료 조건

| # | 완료 조건 | 증명 |
|---|---|---|
| K0-1 | a936972 에서 머지 게이트 전 항목이 다시 초록이다(개발 모드 · 운영 모드 e2e 둘 다) | 원문 수치 · 종료코드 |
| K0-2 | 배포 킷이 컨테이너로 떠서 e2e 가 통과한다(ccmd J 에서 건너뛴 것) | 원문 수치 · 연결 수 |
| K0-3 | `docs/00-corpus/page-map.md` 가 현재 판정 데이터로 다시 생성되고, **저장소 전체 CRLF 줄이 0**이다 | 측정 명령 출력 |
| K0-4 | ccmd J 가 연 쪽(p21 · p23 · p25 · p26)마다 "있는 것 / 없는 것" 근거가 e2e 단계 번호 · 파일 경로 · 캡처로 정리된다 | 보고서 표 |
| K0-5 | 연결 장부에 09-29 절이 생기고, '없음' 2건(DB①→DB② · Special→MainForm)의 근거가 적힌다 | 장부 diff |
| K0-6 | 시연 대본 v2 = 기존 11단계 + **새 장면 2개(학습 AI · 팬 선정)**, 운영 모드에서 끝까지 걸은 단계별 캡처가 있다 | 캡처 폴더 · 대본 파일 |
| K0-7 | lmd 파일 1개로 전부 회수 | 파일 |

못 한 항목은 FAIL 로 적고 다음으로 간다.

## 1. 하드 가드 (위반 = 그 STEP FAIL)

1. main 직접 커밋 · force push · 이력 재작성 · 브랜치/태그 삭제 금지. 이번 변경은 브랜치 `docs/cp3-close` 하나에 쌓는다.
2. **코드 · 스키마 · 마이그레이션 변경 금지.** 이번에 고치는 파일은 문서와 문서 생성기(`docs/02-reports/build_blueprint_match.py`)뿐이다. 코드 결함을 발견하면 고치지 말고 lmd 에 "사이드이슈"로 분리 보고한다.
3. 판정 칸(실동 · 부분 · 미착수, 이어짐 · 약함 · 없음)을 CC 가 **새로 올리거나 내리지 않는다.** 이미 생성기에 들어 있는 CC 초안 판정은 그대로 두고, 근거만 보강한다.
4. 비밀값: 커밋 전 `git diff --cached` 에 토큰 · 비밀번호 · `.env` 값이 없는지 grep. 저장소가 공개다.
5. 스냅샷 · 발행 문서 · 태그 불변. 기존 태그(`demo-20260928` 등)를 옮기지 않는다.
6. Windows 교훈(Gate 4-L, 이번 세션 실측 사고 포함):
   - 개발 · 운영 서버는 분리 프로세스로 띄우고 **PID 로** 끈다. 자기 셸이 걸리는 pkill 패턴 금지.
   - 파이썬 파일 쓰기는 `encoding="utf-8", newline="\n"` 을 둘 다 명시한다(cp949 · CRLF 방지).
   - 고정 sleep 금지. 상태를 기다린다(포트 응답 · 버튼 활성).
   - **커밋 전 CRLF 줄 수를 측정해 0 일 때만 커밋한다**(아래 측정 스크립트).
   - 60줄 넘는 스크립트는 셸 heredoc 에 인라인하지 말고 파일로 써서 실행한다.
   - CMD 명령 줄에 `#` 주석을 섞지 않는다.
7. 외부 공개 조작(저장소 설정 · 공개 범위 · 릴리스) 금지. 배포 킷은 **로컬 컨테이너로만** 띄운다. 클라우드 배포 금지(D-5 는 회장님 결정 대기).

**CRLF 측정 스크립트** — `C:\dev\EDIM_shots\tools\crlf_count.py` 로 저장해 저장소 루트에서 실행한다:

```python
import subprocess
fs = subprocess.run(["git", "ls-files", "-z"], capture_output=True).stdout.decode("utf-8").split("\0")
bad = []
for f in fs:
    if not f:
        continue
    try:
        b = open(f, "rb").read()
    except OSError:
        continue
    if b"\0" in b[:8000]:
        continue
    n = b.count(b"\r\n")
    if n:
        bad.append((n, f))
for n, f in sorted(bad, reverse=True):
    print(n, f)
print("CRLF_FILES", len(bad))
```

엘 실측(09-29, a936972): `CRLF_FILES 1` — `docs/00-corpus/page-map.md` 124줄 전부 CRLF.

**머지 게이트:** typecheck 11 · 단위 전부 · `pnpm db:reset:demo` 후 DB 검증 11종 · reset 후 e2e 2회(개발 모드 1회 + 운영 모드 1회 `pnpm --filter @edim/web build` → `start`) · 운영 모드 e2e 중 `select count(*) from pg_stat_activity` 1회 기록 · `crlf_count.py` = 0 · 비밀값 grep 0. 통과 → ff 머지 → 머지된 main 에서 개발 모드 e2e 1회.

DB 검증 11종: `rls` · `revision` · `backbone` · `platform` · `drawing` · `document` · `project` · `learning` · `special` · `hierarchy` · `macro` (`pnpm --filter @edim/db <이름>:test`).

---

## STEP 0 — 실측 (환경 전제 + 목표 유효성)

```
cd C:\dev\EDIM
git fetch --all --prune --tags
git status --short
git rev-parse HEAD origin/main
git tag --list "demo-*"
git branch -r --list "origin/docs/cp3-close"
```

| 행 | 기대(엘 09-29 실측) | 다르면 |
|---|---|---|
| [환경 전제] `C:\dev\EDIM\.git` 존재 · 작업 트리 깨끗 | 존재 · 변경 0 | 부재면 즉시 중단·보고. 미커밋 변경이 있으면 건드리지 말고 목록만 보고 |
| [환경 전제] Docker Desktop · DB 컨테이너 켜짐 | 켜짐 | 켠 뒤 진행 |
| [목표 유효성] `origin/main` | `a936972` | 다르면 실제 값을 적고, 그 위에서 진행 |
| [목표 유효성] `origin/docs/cp3-close` | 없음 | 이미 있으면 **다른 세션이 먼저 돌린 것** — 재실행하지 말고 내용 확인·보고로 전환 |
| [목표 유효성] page-map 1행 | `main 77cd11f · 2026-09-27` | 이미 a936972 기준이면 STEP 3 은 CRLF 확인만 |
| [목표 유효성] 연결 장부 마지막 합계 | `이어짐 12 · 약함 0 · 없음 2` | 이미 09-29 절이 있으면 STEP 5 는 확인만 |

**[자가검증]** 위 표를 lmd 첫 절에 원문 그대로 붙인다. [환경 전제] FAIL 이면 여기서 끝.

---

## STEP 1 — 기준선 재측정 (a936972, 변경 없음)

`git checkout --detach origin/main` 상태에서 머지 게이트 전 항목을 그대로 돈다. **아무것도 고치지 않는다.**

기록할 것(원문 수치 · 종료코드):
- typecheck 패키지 수 · 단위 테스트 수(CC 보고 295)
- DB 검증 11종 각각 PASS/FAIL
- e2e 개발 모드 `N/348` · 운영 모드 `N/348` · 운영 모드 `pg_stat_activity` 값
- 실패가 있으면 단계 번호 · 첫 오류 줄 · 재시도 1회 결과(재현 여부)

**[자가검증]** 성공 = 두 모드 모두 348/348. 실패 1건이라도 → 원인을 추정으로 단정하지 말고 "재현 O/X"만 적는다. 이후 STEP 은 계속 진행한다(문서 작업이라 막히지 않음).

---

## STEP 2 — 배포 킷 컨테이너 e2e (ccmd J 에서 건너뛴 것)

근거 파일: `docs/DEPLOY.md` · `docker-compose.prod.yml` · `apps/web/Dockerfile` · `.dockerignore`.

1. `docs/DEPLOY.md` 의 절차대로 운영 compose 를 빌드 · 기동한다. 문서와 실제 명령이 다르면 **실제로 된 명령**을 lmd 에 적는다(문서 수정은 STEP 3 브랜치에서).
2. 시드는 DEPLOY.md 가 안내하는 방식으로 넣는다(없으면 "안내 없음"을 사이드이슈로).
3. 컨테이너 web 주소로 e2e: `python scripts/demo_e2e.py http://localhost:<포트> <캡처폴더>` — 첫 번째 인자가 기준 주소다.
4. e2e 중 DB 컨테이너에서 `pg_stat_activity` 1회.
5. `docker compose -f docker-compose.prod.yml down` 으로 정리(볼륨 삭제 옵션 금지 — 개발 DB 와 볼륨을 나눠 쓰는지 먼저 확인).

**[자가검증]** 성공 = 컨테이너 e2e N/348 전부 통과. 실패 시 = 실패 단계 · 컨테이너 로그 첫 오류 20줄 · 개발 모드에서는 통과하는 단계인지 여부.

---

## STEP 3 — 쪽 지도 재생성 + CRLF 원인 수리 (브랜치 `docs/cp3-close`)

원인(엘 확인): `docs/02-reports/build_blueprint_match.py` 484~485행이 `open(..., "w", encoding="utf-8")` 로 쓰는데 `newline` 을 주지 않아, Windows 에서 돌리면 `page-map.md` 가 CRLF 로 나온다.

1. `git switch -c docs/cp3-close origin/main`
2. 생성기 두 `open(...)` 에 `newline="\n"` 추가. 다른 줄은 건드리지 않는다.
3. 생성기의 낡은 사실 문구 1곳 확인: 372행 footer "빈 곳: … **AI 학습 DB**(p23)". 생성기 안 p23 판정이 이미 "부분(CC 초안)"이면, footer 를 그 판정과 어긋나지 않게 고치고 "CC 초안" 표기를 붙인다. **판정 자체는 바꾸지 않는다.**
4. 생성기를 실행해 HTML 2종 + `page-map.md` 를 다시 만든다. 커밋 대상은 **생성기와 `page-map.md`** 뿐이다. HTML · PDF 산출물은 `C:\dev\EDIM_shots\reports\cp3_20260929\` 에 둔다(저장소 밖).
5. `page-map.md` 1행이 `main a936972 · 2026-09-29` 로 바뀌었는지, 4행 합계가 생성기 PAGES 와 같은지 확인한다.
6. `crlf_count.py` 실행.

**[자가검증]** 성공 = `CRLF_FILES 0` · `git diff --stat` 에 생성기와 page-map 두 파일만. 실패 시 = CRLF 가 남은 파일 목록.

---

## STEP 4 — ccmd J 가 연 쪽의 근거 표 (판정은 엘)

대상: **p21 · p23 · p25 · p26** + J 가 새로 연 화면이 닿는 쪽이 더 있으면 그 쪽도(찾은 근거를 적는다).
청사진 원본 = `C:\dev\EDIM_shots\청사진\EDIM.pdf`(JPEG 묶음 — 풀어서 해당 쪽 이미지와 텍스트를 먼저 읽는다).

쪽마다 아래 한 줄씩 채운다(lmd 표 · 저장소 변경 없음):

| 쪽 | 생성기의 현재 판정(CC 초안) | 청사진이 요구하는 것(원문 요지) | 있는 것 — 근거(e2e 단계 번호 · 파일 경로 · DB 테스트) | 없는 것 | 캡처 파일명 |
|---|---|---|---|---|---|

- 근거는 **실제 e2e 단계 번호**(`scripts/demo_e2e.py` 안의 `S..`)와 **실제 파일 경로**만 쓴다. 기억이나 추정으로 적지 않는다.
- 쪽마다 대표 화면 캡처 1장(운영 모드, 1440 폭): `cp3_p21.png` …
- "없는 것"은 청사진 원문에 있는데 화면에 없는 것을 빠짐없이. J 보고서의 정직 고지(스캔 OCR · 3D 형상 · PDF 해석 · 비선형 규칙 없음)와 맞춰 본다.

**[자가검증]** 성공 = 대상 쪽 전부 한 줄씩 · 근거 칸에 추정 표현("아마", "것으로 보임") 0개.

---

## STEP 5 — 연결 장부 09-29 절 (브랜치 `docs/cp3-close`)

파일: `docs/plan/connection-ledger.md`. 지금 마지막 합계는 `이어짐 12 · 약함 0 · 없음 2` 이고, 남은 '없음'은 **DB①→DB② 프로젝션** · **Special 모듈→MainForm** 이다.

1. 파일 끝에 `## 2026-09-29 ccmd J 이후 (CC 주장 — 엘 판정 전)` 절을 추가한다. 앞 절들과 같은 표 형식: `| 연결 | 전 | 후(CC 주장) | 근거 |`.
2. 두 행 각각:
   - 사람이 값을 다시 입력하지 않고 한 흐름으로 이어지는가
   - 무엇이 이어 주는가(테이블 · 함수 · API 이름)
   - 역방향이 막혔는가(DB①←DB② 역류 · 회사가 팬 원자료를 읽을 수 있는가) — `learning:test` · `special:test` 의 해당 단언 이름
   - e2e 단계 번호
3. 합계 줄은 `합계(CC 주장): …` 로 적는다. 엘이 판정한 뒤 "CC 주장"을 뗀다.
4. 앞 절의 기존 행은 고치지 않는다(이력).
5. `crlf_count.py` = 0 확인 후 커밋.

**[자가검증]** 성공 = 두 행 모두 근거 칸에 테이블/함수 이름 + DB 테스트 단언 + e2e 단계 번호가 있음.

---

## STEP 6 — 시연 대본 v2 + 걷기 (새 장면 2개)

기존 자료(저장소 밖): `C:\dev\EDIM_shots\reports\EDIM_시연대본_20260928.md` 와 ccmd J 때 고친 `demo_walk.py`. **위치가 다르면 `C:\dev\EDIM_shots` 안에서 찾아 실제 경로를 lmd 에 적는다.** 못 찾으면 이 STEP 은 "새 장면 2개만"으로 줄여 진행한다.

1. `pnpm db:reset:demo` → 운영 모드로 기동.
2. 기존 11단계를 그대로 한 번 걷는다. 화면 이름 · 숫자가 바뀐 곳은 **화면 그대로** 고친다.
3. 새 장면 2개를 대본 끝에 붙인다(단계 이름 · 버튼 이름은 실제 화면 문구를 쓴다):
   - **장면 12 학습 AI** — 플랫폼 관리자 로그인 → 학습 원천(샘플 도면 · 기술문서) → 발췌 · 정렬화 → 공식 후보와 적합도 → 관리자 승인 → 회사 화면 Toolbox 의 '학습 제안' → 채택 → 유사도 계기판 숫자.
   - **장면 13 Special 팬 선정** — 회사가 의뢰 → 플랫폼 승인 · 부여 → 작업대에 생긴 Special 버튼 → Toolbox 폼 입력(풍량 · 정압) → 동작점 · 효율 · 모터 kW → 사용 기록 · 과금 계량.
   - 각 단계에 자막용 한 줄. 두 장면 모두 "샘플 자료" 표지가 화면에 보이는 단계를 한 컷 넣는다.
4. `demo_walk.py` 에 두 장면을 추가하고 전체를 운영 모드로 끝까지 돌려 단계별 캡처 `demo_01.png` … 를 `C:\dev\EDIM_shots\reports\cp3_20260929\walk\` 에 남긴다.
5. 저장: `C:\dev\EDIM_shots\reports\cp3_20260929\EDIM_시연대본_v2_20260929.md`(utf-8 · LF).
6. 저장소 `docs/DEMO.md` 에 장면 12 · 13 을 같은 요지로 추가한다(브랜치 `docs/cp3-close`). 기존 장면 번호는 바꾸지 않는다.
7. 서버는 PID 로 종료.

**[자가검증]** 성공 = 13장면 전부 캡처 있음 · 안 되는 단계는 "뺌 — 이유"로 표기(지어내지 않음). 실패 시 = 멈춘 단계와 화면 캡처.

---

## STEP 7 — 머지 · 태그

1. `docs/cp3-close` 에 대해 머지 게이트 전 항목(위 1절) 실행.
2. 통과 → `origin/main` 이 STEP 0 값 그대로인지 다시 확인 → ff 머지 → push.
3. 머지된 main 에서 개발 모드 e2e 1회.
4. 머지된 main 에 annotated 태그 `demo-20260929-cp3` → push. (시연 영상 새 장면 촬영용 안전판)
5. 게이트 FAIL 이면 머지하지 않고 브랜치만 push, 이유를 lmd 에.

**[자가검증]** 성공 = `git rev-parse origin/main` = 머지 커밋 · 태그가 그 커밋을 가리킴.

---

## STEP 8 — lmd (회수)

파일: `C:\dev\EDIM_shots\reports\cp3_20260929\lmd-cp3-close-20260929.md` (utf-8 · LF). 같은 폴더에 캡처 · 생성된 대조 HTML · 대본 v2 를 둔다.

구성:
1. STEP 0 표(원문)
2. STEP 별 PASS/FAIL 표 — 원문 수치 · 종료코드 · 커밋 해시 · 태그
3. STEP 1 · 2 · 7 의 e2e 수치(개발 · 운영 · 컨테이너)와 `pg_stat_activity` 값 3개
4. STEP 4 쪽 근거 표 · STEP 5 장부 diff 요약 — **"CC 주장"** 표기
5. 대본 v2 에서 고친 곳 · 뺀 단계
6. 사이드이슈(코드 결함 · 문서와 실제 명령 불일치) — 고치지 않은 채 목록만
7. 엘에게 묻는 것(있으면 선택지로)

---

## 이 ccmd 뒤에 엘이 할 일 (CC 몫 아님 — 참고)

- 머지된 main 을 샌드박스에서 독립 재측정(typecheck · 단위 · DB 11종 · 운영 모드 e2e).
- STEP 4 · 5 근거로 쪽 판정과 연결 장부를 확정 → 청사진 대조 **확정판 4** · README 수치 갱신.
- CP3 보고서(PDF) + 새 장면 2개 촬영 가이드.
- 회장님 결정 2건을 CP3 에서 받음: D-5 배포 장소 · 비용 / D 청크 컨설팅의 익명 집계 데이터 경계(P3-a Q2 "플랫폼의 고객사 데이터 열람은 나중에"와의 관계).
