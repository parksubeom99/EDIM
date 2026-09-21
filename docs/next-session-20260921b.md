# 다음 세션 인계 노트 (nmd) — 2026-09-21 (b) · P6 브랜치 머지 승인 대기

## 0. 시작 전에 읽을 것
1. 프로젝트 메모리 `business-architecture` → `principles-and-architecture` → `overview` → `ways-of-working`
2. `docs/01-design/P6-approval-binding.md` — **사후 확인 대상 결정 4건**이 들어 있다
3. `docs/plan/connection-ledger.md` 끝의 "P6 구현 후" 절 · `docs/00-corpus/page-map.md`(청사진 70쪽 판정)
4. 이 노트 (※ 이 노트는 **브랜치에만** 있다 — main 에는 09-21 판이 있다. ff 머지를 깨지 않으려고 main 에 따로 커밋하지 않았다)

## 1. 지금 상태 (실측 · 엘 샌드박스)
- **main = `fd31d88`** (P4-b 까지 + 문서·증빙). **브랜치 `feat/p6-approval-binding` = `28c3e20` + 이 노트 커밋** — 원격에 있음. **main 머지는 회장님 승인 대기**(회장님이 "여기까지 하고 다음 채팅에서"라고 하심 — 승인 말씀은 없었다).
- 브랜치 실측: typecheck 11 · 테스트 189 · rls · revision · backbone 13 · platform 25 · drawing 16 · document 37 · project · auth PASS · **demo_e2e 99/99**
- 연결 장부: 이어짐 12 · 약함 0 · 없음 2 (DB①→DB② = P3-b · Special = P3-c — 둘 다 엘 단독 불가)
- 청사진 70장: 실동 18 · 부분 22 · 미착수 11 · 개념·표지 19

## 2. 다음 세션 첫 작업
1. 회장님께 **P6 머지 승인 여부**와 **결정 4건 사후 확인**을 여쭌다 → 승인 시 `git merge --ff-only` → push → main 에서 재검증(typecheck · test · DB 검증 · auth · e2e 99/99)
2. 그 뒤 엘이 할 수 있는 것 (회장님이 09-21 에 인용·확인하신 목록):
   - **깨진 검증 2종 수리** — `hierarchy:test`(`root has 1 child after AHU-02 moved away — children=2`) · `macro:test`(`retrievable at revision 1 — got approved/2` · `supersedes prior … got id2/3`). main 에서도, 완전히 새 DB(drop→migrate→seed)에서도 실패. 원인 미확정(기대값이 시드·레지스트리 변경을 못 따라간 것으로 추정 — **추정이다, 코드를 읽고 확정할 것**). 수리 후 `docs/ci/ci.yml` 에도 넣는다.
   - **변경 전파를 한 시나리오로** — 표/치수 한 칸 변경 → BOM·도면·원가·구매 수량이 *함께* 바뀌고 앞 스냅샷은 그대로(P6 기준 3 — 지금은 S10b·S18·S20b 로 흩어져 있다)
   - **DEMO 리허설 보강** — 장면 11(승인 → 발주 → 추적) 포함 11장면 대본 점검

## 3. 회장님 결정 대기
1. P6 머지 + 결정 4건(승인 대상 = BOM 스냅샷 / 발행·발주만 승인 요구 / 승인 기록 수정 불가 / 플랫폼 단계 = 같은 스냅샷)
2. 코드 개정에 슬롯 **F** 포함 여부 (지금은 F 가 붙은 실행의 근거 개정이 빈 값)
3. **Arrangement 묶음**(p13·35·36·46·58) 우선순위
4. 70장 판정 조정(후하거나 박한 쪽)

## 4. 회장님 몫 (도서관 PC 는 GitHub 차단 — 회장님 PC 에서)
Windows 로컬 실행 1회(`git pull` → `pnpm db:generate && pnpm db:migrate` → DEMO.md §1) · CI 배선(`docs/ci/ci.yml` → `.github/workflows/ci.yml`, 엘 토큰은 Workflows 403) · API 키로 Prompt 1회 · 회사 실 표 · 88md 백업 · DXF 추출 연구 결과 · (사장님) D1 · 기술 문서

## 5. 정직 고지
Windows 실행 0회 · 단가 샘플 · 도면은 선과 글자 · Prompt→Macro 실모델 0회 · PCR 5줄 · Supplier 열 빔 · 로그인 이메일만 · 배포 0회 · P6 완료 기준 4개 중 2 달성/1 부분/1 미달 · 반려 후 재요청 e2e 장면 없음

## 6. 이번 세션 엘의 실수 (반복 금지)
인라인 `pkill -f`(자기 셸 사망) · e2e 단언 이름 > 실제 비교(S24c) · 판정 기준을 쓰고 스스로 어김(p58) · 텍스트 추출본만 보고 p19 '빈 장' 단정 · 새 버튼 라벨에 "BOM Run"을 넣어 e2e 선택자 충돌(S6) · 고정 sleep 의존 · **돌려 본 적 없는 검증을 "검증 목록"에서 빼고 보고**(hierarchy·macro) · 문서의 e2e 수치를 실행 전에 적음(98 → 실제 99)

## 7. 샌드박스 재개 절차
```
npm i -g pnpm@9.15.0 ; apt-get update && apt-get install -y postgresql
# up.sh: initdb /tmp/pgdata(trust) → pg_ctl -o '-p 5433 -k /tmp' → role edim(superuser)/db edim — PG 는 bash 호출마다 죽으니 매 호출 앞에서
git clone …/EDIM.git && cd EDIM && git checkout feat/p6-approval-binding   # ← 머지 전이면 브랜치로
cp .env.example .env && pnpm install --frozen-lockfile && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo
pip install ezdxf playwright matplotlib --break-system-packages   # chromium: /opt/pw-browsers
# e2e: 한 스크립트 안에서 killdev(파일로!) → db:reset:demo → pnpm dev & → python3 scripts/demo_e2e.py http://localhost:3000 shots → 99/99
# 보고서: unzip /mnt/project/EDIM.pdf → python3 docs/02-reports/build_blueprint_match.py <corpus> <shots> <out> <sha> → playwright page.pdf 1920×1080
```
- 토큰: 지난 채팅 본문의 기존 `el` 토큰(회장님 승인). Contents 쓰기 OK · Workflows 403. push 는 URL 에 토큰을 실어 1회성으로(remote 에 남기지 말 것).
