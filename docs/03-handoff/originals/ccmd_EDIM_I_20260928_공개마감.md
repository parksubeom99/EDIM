# ccmd I — 밤샘: A 청크 "공개 · 마감" (2026-09-28 밤 → 09-29 아침)

> 엘 → CC. 근거: 사장님 지시(회장님 전달, 09-28) "나머지도 전부 알아서 끝까지 · 저장소 퍼블릭 전환 허용 · 회장님 이력으로 써도 됨".
> 회장님 승인(09-28 "권고대로 ㄱ"): 완주 설계안 D-1~D-6 전부 엘 권고대로.
> - D-1 퍼블릭 전환 **승인됨** · D-2 권리 표기 = "All rights reserved · 포트폴리오 열람용"(라이선스 파일 없음)
> - D-4 외부 자료가 없는 곳은 **샘플로 돌리고 '샘플' 표지** · D-5 배포 = 킷 + 운영 모드 검증까지(클라우드 업로드 안 함)
> - D-6 AI 키 없으면 결정론 폴백 · D-3(Special 팬 선정)은 B·C 청크(다음 ccmd)
> 작업 폴더 `C:\dev\EDIM` · 캡처·보고서 `C:\dev\EDIM_shots\` · 청사진 `C:\dev\EDIM_shots\청사진\EDIM.pdf`
> 머지: ccmd D~H 와 같은 **머지 게이트** 통과분만 main fast-forward (회장님 사전 승인 상속).

---

## 0. 이번 밤의 목표 (완료 정의)

아침에 회장님이 공개 저장소 링크 하나를 채용 담당자에게 보낼 수 있어야 한다.

| # | 완료 조건 | 증명 |
|---|---|---|
| 1 | 저장소가 **퍼블릭**이고, 로그인하지 않은 브라우저에서 README 가 보인다 | 비로그인 `curl` 200 |
| 2 | README 가 공개용이다 — 무엇·왜·화면·구조·실행법·검증·샘플 표지·권리 표기 | 렌더 캡처 |
| 3 | GitHub Actions CI 가 main 에서 **초록** | run URL |
| 4 | 비밀번호 로그인 (p11) · Macro 설계 검증 (p39) · Office 내보내기 (p48) · Delete 미리 잠금 (p58) | e2e 단계 |
| 5 | `docker compose -f docker-compose.prod.yml up` 한 줄로 운영 모드가 뜨고 e2e 가 통과 | 로그 · 연결 수 |

하나라도 못 하면 그 항목만 FAIL 로 보고하고 다음 항목으로 간다.

## 1. 하드 가드 (위반 = 그 STEP FAIL)

1. main 직접 커밋 · force push · 브랜치/태그 삭제 · 이력 재작성 금지. 항목마다 브랜치를 **쌓는다**.
2. 마이그레이션은 **추가만**(이번 밤 예상: 0032 하나). 새 테이블·열 = 기존 RLS 규칙 그대로 · platform 스키마 미접촉.
3. 뜬 스냅샷 · 발행 문서 · 발주 구매 요청 불변. 새 기능은 **스냅샷을 읽기만** 한다.
4. 새 API = viewer 403 · 다른 회사 404/0건 e2e 단언.
5. **공개 저장소 원칙**: 비밀값 · 실 비밀번호 · 개인 연락처 · API 키를 커밋하지 않는다. 데모 비밀번호는 README 에 적는 **샘플 값**만. 커밋 전 매번 `git diff --cached | grep -E "github_pat_|ghp_[A-Za-z0-9]{30}|sk-ant-|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY"` 0건 확인(Git Bash).
6. Windows 교훈(Gate 4-L): 서버는 분리 실행 · PID 로 종료 · 파일 쓰기 utf-8 명시 · 고정 sleep 추가 금지(상태 대기).
7. 시연 대본(`EDIM_시연대본_20260928.md`)의 화면을 바꾸면 같은 커밋에서 대본도 고친다. 특히 **로그인에 비밀번호 칸이 생기므로 대본 1단계를 고친다**.
8. 태그 `demo-20260928` 은 건드리지 않는다(촬영본 기준점).

**머지 게이트(운영 모드 포함, H 와 동일):** typecheck 11 · 단위 전부 · `db:reset:demo` 후 DB 검증 9종(+새 DB 테스트) · reset 후 e2e 2회 = 개발 모드 1회 + 운영 모드 1회(`pnpm --filter @edim/web build` → `start`) · 운영 모드 e2e 중 `select count(*) from pg_stat_activity` 1회 기록 · 새 마이그레이션 "추가만" 확인. 통과 → ff 머지 → 머지된 main 에서 개발 모드 e2e 1회. 게이트는 2~3 항목 묶음으로 돌려도 된다.

---

## STEP 0 — 실측 (H-31 환경 전제)

```
cd C:\dev\EDIM
git fetch --all --prune
git rev-parse origin/main origin/docs/blueprint-match-el-final-3
git status --short
docker ps
gh --version
gh auth status
```
기대: main `6193723` · docs `f90cffc` · 작업 트리 깨끗 · DB 컨테이너 떠 있음. 다르면 실제 값을 보고서에 적고 이어간다.
`gh` 가 없거나 로그인이 안 돼 있으면 STEP 9 는 회장님 몫으로 넘긴다(아래 안내문 그대로 보고서에).

## STEP 1 — 확정판 3 생성기 병합

`docs/blueprint-match-el-final-3`(f90cffc)은 main 위 문서 한 커밋이다. typecheck 후 ff 머지·push.

## STEP 2 — E8 툴바 Delete 미리 잠금 (p58)

- 대상: `apps/web/app/(app)/workbench/toolbar.tsx` 의 `delete` 명령.
- 지금: 잠긴 구획(관계가 걸린 구획)을 골라도 버튼이 눌리고 서버가 409 문구로 막는다. 표 쪽 Delete 는 **미리 비활성**.
- 할 일: 표 쪽이 쓰는 같은 판정(관계 걸림 여부)으로 툴바 Delete 도 미리 비활성 + `title` 에 이유 한 줄. 서버 409 가드는 **그대로 둔다**(이중 방어).
- e2e: 잠긴 구획 선택 → Delete `disabled` 단언 · 안 잠긴 구획 → 활성 · 누르면 삭제.

## STEP 3 — E6 Macro 로 쓰는 설계 검증 (p39)

- **먼저 청사진 p39 이미지를 읽는다**(도면 Templet 호출 설정 6단계 중 설계 검증 칸).
- 지금: 설계 검증은 제품 코드의 `role="rule"` 표(target · op · value)로만 돈다(`packages/bom-code/src/index.ts` 규칙 판정 · 판정은 BOM Run 때 스냅샷 `dims.violations` 에 박힘).
- 할 일: 규칙 표에 **매크로 규칙** 한 종류를 더한다.
  - 규칙 행의 `op` 에 `macro` 를 허용하고 `value` 에 **승인된 매크로 이름**을 적는다.
  - 판정: 그 매크로를 기존 결정론 실행기(런타임 LLM 0)로 스냅샷 값에 대해 실행 → 결과가 참(1)이면 통과, 거짓(0)이면 위반 · 위반 문구는 규칙의 `name`.
  - **승인 안 된 매크로 · 없는 매크로 · 실행 오류**는 통과로 치지 않는다 → 위반 "검증 매크로 없음/미승인/오류: 이름".
  - 판정 결과는 기존과 같이 스냅샷 `dims.violations` 에만 박힌다(나중에 매크로를 고쳐도 앞 스냅샷 판정 불변).
- 시드(샘플): 매크로 `V_SECTION_RATIO` — "구획 길이 합 = 전장" 같은 한 줄 검증식 1개를 승인 상태로. 규칙 표에 `op=macro` 행 1개.
- 테스트: 단위(통과·위반·미승인·없음·오류 5종) · e2e(통과 배지 → 매크로 조건을 깨는 치수로 저장 → Run → 위반 배지 → 도면 DXF 422) · 캡처 `70_macro_verify.png`.

## STEP 4 — E7 인쇄본 Office 내보내기 (p48)

- 대상: `apps/web/app/api/documents/[id]/print/route.ts` 가 만드는 인쇄본(견적 · Tech Data · 구매 요청 등). 인쇄본은 **스냅샷 body 에서만** 나온다 — 그 body 를 그대로 옮긴다.
- 할 일: 같은 문서의 `.docx` · `.xlsx` 내려받기.
  - 라이브러리: `docx`(Word) · `exceljs`(Excel) — 둘 다 순수 JS. 버전 고정(`pnpm add -F @edim/web docx@<정확한 버전> exceljs@<정확한 버전>`).
  - API: `GET /api/documents/[id]/export?format=docx|xlsx` → `Content-Disposition: attachment; filename*=UTF-8''...`(한글 파일명). 모르는 format = 400.
  - 화면: 인쇄본 상단에 "Word · Excel" 버튼(Print Set-up 인쇄 양식 편집기(H9)의 양식을 쓰는 문서는 양식 순서 그대로).
  - 숫자는 **표시 문자열이 아니라 값**으로 넣는다(엑셀 합계가 되게). 통화·날짜 서식만 지정.
- 테스트: e2e 에서 두 파일을 받아 Python 으로 연다(`python-docx` · `openpyxl`) → 견적 합계 · 품목 수 · 문서 번호가 인쇄본 HTML 값과 **같다** 단언. viewer 는 403, 다른 회사 404.

## STEP 5 — 비밀번호 로그인 (p11) — 마이그레이션 0032

- 지금: `/api/auth/login` 은 이메일만 받는다(`packages/auth/src/resolve.ts` `authenticate()` · 로그인 화면 "sign in (dev)").
- 할 일:
  1. `0032_password`: `app_user.password_hash text NULL` 추가만.
  2. 해시 = Node 내장 `crypto.scrypt`(외부 의존 0) · 형식 `scrypt$N$r$p$salt$hash` · 비교는 `timingSafeEqual`.
  3. 판정: 비밀번호 해시가 있는 사용자는 **비밀번호 필수**. 없는 사용자는 `EDIM_DEV_LOGIN=1` 일 때만 이메일만으로 통과(개발 편의) — **운영 모드 기본값은 0**.
  4. 플랫폼 관리자 로그인도 같은 판정.
  5. 틀린 비밀번호 5회/10분 → 그 이메일 잠시 잠금(메모리 카운터면 충분, 429).
  6. 시드: 데모 계정 전부에 **샘플 비밀번호 `edim-demo-2026`** 해시. README 에 "샘플 계정 · 공개 데모용" 으로 적는다.
  7. 화면: 비밀번호 칸 · 문구 "sign in (dev)" 제거 · 오류 문구 한 가지("이메일 또는 비밀번호가 맞지 않습니다" — 계정 존재 여부를 흘리지 않게).
  8. SSO: **만들지 않는다**(고객사 IdP 가 외부 입력). 대신 `EDIM_OIDC_ISSUER` 가 설정됐을 때만 버튼이 보일 자리와 `docs/DEPLOY.md` 의 "SSO 연결 자리" 한 절 — "아직 없음 — 필요한 입력: 고객사 IdP 주소 · client id".
- 테스트: auth 단위(해시·비교·잠금) · e2e(옳은 비번 통과 · 틀린 비번 401 · 5회 429 · 해시 없는 계정은 운영 모드에서 거절) · `demo_e2e.py` 로그인 헬퍼에 비밀번호 추가 · 시연 대본 1단계 수정.

## STEP 6 — 배포 킷 (E2 · p9 선행)

- `apps/web/Dockerfile`: 다단계(pnpm install → `next build` → 운영 실행). Next `output: "standalone"` 을 쓸 수 있으면 쓴다(이미지 작게). 이미지 안에 `.env` 를 굽지 않는다.
- `docker-compose.prod.yml`: `db`(PG16) → `migrate`(1회성: `db:migrate` + 필요 시 시드) → `web`(운영 모드 · `AUTH_SECRET` 필수 · `EDIM_DEV_LOGIN=0`). 포트 3000.
- `docs/DEPLOY.md`: 로컬 운영 실행 · 환경변수 표 · 비밀값 만드는 법 · 클라우드로 옮길 때 체크리스트(DB 백업 · 도메인/HTTPS · 연결 풀 한도) · SSO 연결 자리. **특정 클라우드 계정 작업은 하지 않는다**(D-5).
- 검증: CC PC 에서 `docker compose -f docker-compose.prod.yml up -d --build` → 컨테이너 web 에 대고 e2e 1회 → `pg_stat_activity` 기록 → 내림. 이미지 크기 보고.

## STEP 7 — CI 배선 (M6 → CC 몫으로)

- `docs/ci/ci.yml` 을 `.github/workflows/ci.yml` 로 복사(원본은 "배선 완료 — 원본은 .github" 한 줄 남기고 유지).
- STEP 5 로 로그인이 바뀌었으니 CI 가 필요로 하는 값(`AUTH_SECRET` 은 `.env.example` 값)을 확인.
- push 는 **회장님 PC 의 git 자격**으로(엘 토큰은 Workflows 권한 없음 · 403 실측).
- 실행 확인: `gh run list -L 3` 또는 GitHub 웹 Actions 탭. **초록이 될 때까지** 원인 수리(워크플로 파일만 고치는 것으로 해결 안 되면 제품 결함으로 보고서에 분리).
- README 상단에 CI 배지.

## STEP 8 — 공개용 README · 저장소 정리 (D-2 · D-4)

README 는 **채용 담당자 · 엔지니어가 3분 안에** 이해하는 문서로 다시 쓴다(지금 README 의 좋은 부분 — 화면 표 · 핵심 아이디어 · 정직 고지 — 은 살린다).

순서:
1. 제목 + 한 줄: "제품 코드 한 줄에서 BOM · 도면 · 원가 · 견적 · 구매가 나오는 주문생산(CTO) 플랫폼" + CI 배지 + 기술 배지(TypeScript · Next.js 15 · PostgreSQL 16 · Prisma)
2. **왜 만들었나** 3줄 — 주문생산 공장에서 사양이 바뀔 때마다 도면·BOM·견적을 손으로 다시 만드는 문제
3. 화면 표(지금 것 유지 · 최신 캡처로)
4. 구조 그림 — **mermaid** 로(GitHub 가 그대로 그림): 원천 자료 → DB①(관리자) —단방향 투영→ DB②(메인) → PLM 코드·드로잉 셋업 → CPQ(BOM·원가·도면·견적) → ERP(구매) · Toolbox ↔ DB② · Special ↔ DB① · DB②→DB① 차단. 아직 없는 노드는 "(다음 단계)" 표기.
5. **설계 원칙 4개** (각 2줄): 결정론 런타임(LLM 은 빌드 타임 번역기 · 런타임 호출 0) · 스냅샷 불변(승인·발행·발주는 BOM 스냅샷에 묶임) · 멀티테넌트 격리를 DB 가 강제(RLS · 역류 차단은 DB 권한) · 검증은 코드로(e2e · DB 검증 9종 · 운영 모드)
6. 빠른 실행: docker compose 한 줄 + 샘플 계정 표(비밀번호 `edim-demo-2026`, **샘플**)
7. 검증 표(실측값 · 날짜)
8. **샘플 데이터 고지**: 단가 · 표 · CAD 규칙 · 원가 배율은 샘플이며 실제 회사 자료가 아니다
9. 저장소 지도(apps · packages · docs 폴더 한 줄씩)
10. 맨 아래 **권리 표기**: "© 2026 EDIM. All rights reserved. 이 저장소는 포트폴리오 열람용으로 공개되며, 코드·문서의 복제·배포·상업적 이용을 허락하지 않습니다." — **LICENSE 파일은 만들지 않는다**.
11. 짧은 English summary 절(5~8줄).

정리:
- `docs/next-session-*.md` 9개 → `docs/03-handoff/` 로 `git mv`(내용 수정 없음). 깨진 상대 링크가 있으면 고친다.
- `docs/00-corpus/README.md` 에 "원천: 파트너 제공 청사진·설계 코퍼스 — 사장님 공개 허락(2026-09-28)" 한 줄.
- 커밋 전 비밀값 grep(하드 가드 5).

## STEP 9 — 퍼블릭 전환 (D-1 · 되돌리기 어려운 작업 — STEP 1~8 머지 **뒤**에만)

```
gh repo edit parksubeom99/EDIM --visibility public --accept-visibility-change-consequences
gh repo view parksubeom99/EDIM --json visibility
curl -s -o NUL -w "%{http_code}" https://raw.githubusercontent.com/parksubeom99/EDIM/main/README.md
```
기대: `PUBLIC` · `200`. 이어서 `gh repo edit --description "..." --add-topic cpq,plm,erp,configure-to-order,nextjs,postgresql,typescript`(설명 한 줄: "Configure-to-Order platform: one product code → BOM · drawings · cost · quotation · purchasing").

`gh` 가 없거나 권한 오류면 **하지 말고** 보고서에 회장님 안내를 그대로 적는다:
> GitHub 웹 → parksubeom99/EDIM → Settings → 맨 아래 Danger Zone → Change repository visibility → Change to public → 저장소 이름 입력 → 확인.

## STEP 10 — 판정 초안 갱신 · README 상태 줄

- `docs/02-reports/build_blueprint_match.py` 의 p11 · p39 · p48 · p58 have/gap/ev/shot 을 이번 결과로 **초안** 갱신(머리말 "CC 초안 — 엘 재측정 전"). 판정을 올리는 기준은 ccmd F 와 같다: 그 쪽 "없는 것" 중 외부 입력이 필요 없는 항목이 전부 닫히고 e2e 로 증명될 때만. (p11 은 SSO 가 외부 입력이므로 비밀번호만 닫히면 실동 후보 · p58 은 CAD 편집기가 남으므로 부분 유지가 맞을 것)
- README 상태 줄 = 이번 실측값.

## STEP 11 — 보고서 (lmd)

`C:\dev\EDIM_shots\reports\EDIM_report_I_20260929.md` (utf-8):
- STEP 별 PASS/FAIL · 브랜치 · 커밋 해시 · main 최종 해시
- 게이트 수치: typecheck · 단위 수 · DB 검증 · e2e 개발/운영 · 운영 모드 연결 수 · compose 킷 e2e · 이미지 크기
- CI run URL 과 결과 · 퍼블릭 전환 결과(비로그인 200 여부) 또는 회장님 안내
- 바뀐 e2e 기대값 · 시연 대본 수정 내용
- 추가한 의존성과 정확한 버전
- 사이드 이슈(발견했지만 이번 범위 밖) — 본 작업은 멈추지 않고 분리 기록
- 회장님이 할 일(있으면 한 줄씩)

끝나면 서버는 PID 로 종료 · DB 는 `db:reset:demo` 상태 · compose 킷 컨테이너는 내려 둔다.

---

## 다음 (이번 밤 범위 밖 — 손대지 않음)

B 학습 AI 1수준 + 이중 프로젝션 · C Special 팬 선정 · D 고도 계산·컨설팅·CAD 1단계 · E 확장 1차 — 엘이 설계서를 따로 준다.
