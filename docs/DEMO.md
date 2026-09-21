# EDIM 베타 — 발표 절차서 (v5, 2026-09-21 · P3-a·P4-a·P4-b·P6 반영)

> 목적: 회장님이 **자기 노트북에서** 베타 1수직을 직접 띄우고, 7장면으로 시연하고,
> 질문에 방어하는 전 과정. 이 문서 하나로 준비 → 리허설 → 발표가 끝나야 한다.
> 방향 기준: EDIM.pdf 70장(NOVA 청사진). 시연은 그 중 **등뼈 한 줄**(코드 → Run → BOM·원가·도면)이다.

---

## 0. 발표 한 문장

"제품 코드 한 줄을 고르면, 승인된 규칙이 실행돼서 BOM·원가·도면이 **같은 입력에 항상 같은 답**으로 나옵니다. 실행에는 AI가 없습니다."

---

## 1. 로컬 준비 (Windows · 최초 1회 · 약 20분)

전제: Docker Desktop 실행 중, 포터블 Node(`%LOCALAPPDATA%\edim-node`) PATH 반영, pnpm 9.15.

```powershell
git clone https://github.com/parksubeom99/EDIM.git C:\dev\EDIM
cd C:\dev\EDIM
copy .env.example .env
rem .env 에는 접속 주소가 3개다: DATABASE_URL(소유자) · APP_DATABASE_URL(회사, RLS 적용)
rem · PLATFORM_DATABASE_URL(플랫폼 관리자, DB①). 셋 다 있어야 /platform 이 열린다.
pnpm install --frozen-lockfile
pnpm db:up                 # PostgreSQL 16 → localhost:5433
pnpm db:generate
pnpm db:migrate
pnpm db:seed               # 테넌트·사용자·계층·프로젝트 PS-61313-5
pnpm db:seed:demo          # ★ 승인된 매크로 사전 탑재 (fresh DB에서도 첫 Run이 455.4)
pnpm dev                   # http://localhost:3000  (pnpm start 아님)
```

확인(다른 터미널):

```powershell
pnpm typecheck             # 11 패키지 Done
pnpm -r --workspace-concurrency=1 test   # 189 passed
pnpm --filter @edim/db revision:test   # Tier B 8/8 (append-only · RLS · 감사)
pnpm --filter @edim/db backbone:test   # P1 코드 등뼈 13/13
pnpm --filter @edim/db platform:test   # ★ P3-a 25/25 (DB①/DB② 권한 분리·역류 차단)
pnpm --filter @edim/db drawing:test    # ★ P4-a 16/16 (도면 개정·발행 잠금·스냅샷 연결)
pnpm --filter @edim/db document:test   # ★ P4-b·P6 37/37 (견적·Tech Data·구매 요청 · 발행/발주 잠금 · 승인된 BOM 만 발행·발주)
pnpm --filter @edim/db project:test    # 프로젝트·승인 도메인
pnpm --filter @edim/db hierarchy:test  # 09-21 수리 — 트리 생성·이동·개정·감사
pnpm --filter @edim/db macro:test      # 09-21 수리 — 첫 승인 r1·반려는 번호 소비 안 함 (※ 매크로를 전부 지운다 → 아래 reset:demo 필수)
pip install playwright ezdxf ; playwright install chromium   # ezdxf = 도면(DXF)을 파싱해 검증
pnpm db:reset:demo         # ★ 리허설 흔적 제거 (테스트·이전 e2e가 남긴 Rev·매크로 revision)
python scripts\demo_e2e.py http://localhost:3000 shots   # ★ 99/99 PASS면 발표 가능
pnpm db:reset:demo         # ★ e2e 자신도 흔적을 남긴다 → 시연 직전 반드시 한 번 더
```

`demo_e2e.py`가 99/99이면 아래 시연 11장면은 **기계적으로 재현이 보장된** 상태다.

**리허설 잔재 규칙** — `code_revision`은 append-only라 앱에서 지울 수 없다. e2e·`revision:test`·손 리허설을 한 번이라도 돌린 DB에서는 본 시연의 첫 저장이 "Rev A"가 아니라 "Rev C/E…"로 찍히고, 매크로도 시드된 r1 이 아니라 r2+ 로 보인다. e2e의 `S2d`가 이 상태를 FAIL로 잡아준다.

**발표 당일 아침 순서 (이 순서 그대로):** `docker ps` healthy → `pnpm db:reset:demo` → `demo_e2e.py` 99/99 → **`pnpm db:reset:demo` 한 번 더** → 브라우저 강력 새로고침(Ctrl+Shift+R) → 이후 시연 시작 전까지 화면 클릭·저장 금지.

---

## 2. 시연 대본 — 11장면 (약 16분)

로그인: `owner@acme.test` (이메일만, 비밀번호 없음 — 베타 스켈레톤 인증).

| # | 화면 | 하는 것 | 말하는 것 | 청사진 |
|---|---|---|---|---|
| 1 | 작업대 | 좌측 Work Hierarchy에서 **PS-61313-5** 클릭 | "Inspector에 프로젝트 사양·승인 단계가 붙습니다. 화면 5구역은 청사진 p56 그대로입니다." | p56·p59 |
| 2 | Code Builder | D=**630 열회수 로터**, E=**SS** 선택 → `EU-55-2123-630SS VALID` → 사유 입력 → **Save · Rev A** → 새로고침해도 남음. E=AL로 바꿔 **Rev B** 저장 → 이력 A·B 표시 | "RCCS는 제품 속성의 코드화입니다. 조립 규칙이 틀리면 VALID가 안 뜨고, 저장은 개정으로만 쌓입니다(p24 Revisions). 지운 적이 없는 이력입니다." | p5·p12·p24·p29~34 |
| 3 | Macro | Verify → **Save draft** 시 일부러 `Table9(...)` 같은 미지 참조를 넣어 **거부** 시연 → 원본 DSL로 복구 | "틀린 규칙은 승인 전에 차단됩니다. 정적검증 + 런타임 dry-run 이중 게이트." | p27·p60 |
| 4 | Macro | 승인(이미 r1 승인 탑재; 라이브 승인 시 r2로 상승·이전 superseded) | "승인된 매크로만 공식 Run이 가능합니다. 승인 이력은 감사 로그에 남습니다." | p55·p62 |
| 5 | Action Bar | **EDIM Run** → 455.4 | "실행에 LLM이 없습니다. 같은 코드면 같은 값. 청사진 p65 EDIM RUN입니다." | p65 |
| 6 | BOM | **BOM Run → EBOM Run → Cost** | "BOM 11행, 섹션별 EBOM, 원가 합계. 사양 열은 청사진 **p14 공기조화기 사양표** 그대로입니다. 단가는 아직 샘플입니다 — 회사 단가표를 꽂으면 그 자리에서 실 견적이 됩니다." | p14·p62·p66~67 |
| 7 | Design | **Export**(DXF R12) → CAD/뷰어로 열어 평면 배치 확인 | "도면도 코드의 함수입니다. 지금은 평면 배치 1장, 다음이 승인도·제작도입니다." | p37~40 |

| 8 | Company Info. → Platform Console | `/m/company`에서 **Special 의뢰** 제출 → 로그아웃 → `platform@edim.test`로 로그인 → `/platform`에서 **승인** → 다시 회사 계정으로 보면 **승인됨** | "3계층입니다. 회사가 자기 코드·표·매크로를 고치는 건 회사 관리자 선에서 끝나고(셀프서비스), 플랫폼으로 올라오는 건 Special 의뢰뿐입니다. 그리고 **플랫폼 화면에는 고객사 업무 데이터가 없습니다** — 참는 게 아니라 DB 권한이 없습니다(p54)." | p54·p59·p64 |

| 9 | Design 탭 → Set-Up 표 → Design 탭 | BOM Run 뒤 **평면도·조립도 DXF**를 받고 → Set-Up에서 **치수 표 한 칸**(55행 W)을 2472→2600으로 고치고 → 같은 코드로 다시 Run → 도면이 따라 바뀐다. 도면을 **등록**하면 번호·개정(A→B)·상태가 붙고, **발행**하면 잠긴다 | "도면이 코드에서 나옵니다. 그리고 치수는 제가 코드에 박아 둔 값이 아니라 **회사가 등록한 표**에서 옵니다 — 표를 고치면 도면이 바뀝니다. 발행된 도면은 DB가 수정을 거부합니다." | p38~40·p24 |

| 10 | Document 탭 → 인쇄본 → Purchasing | BOM Run 뒤 **견적서 등록** → 문서 번호(QR-61313-01 Rev A)를 눌러 **인쇄본**을 연다 → 합계가 Cost 카드와 같은지 같이 본다 → **Tech Data 등록** → **구매 요청 만들기** → 상단 메뉴 Purchasing 에서 **→ 견적 요청 → 발주**(PO 번호가 붙는다) → **Export CSV** 를 엑셀로 연다 | "견적·기술 자료·구매 요청이 전부 **같은 BOM 한 장**에서 나옵니다. 견적 합계는 다시 계산한 값이 아니라 그 BOM 에 저장된 원가 그대로라서 **한 원도 다를 수 없습니다**. 구매 요청에는 그 BOM 에서 사 오는 품목만 들어오고, 같은 BOM 으로 두 번 살 수 없습니다. 발주된 것은 DB 가 수정을 거부합니다. 인쇄본 발치에는 어느 BOM·어느 코드 개정·어느 매크로 개정에서 나온 숫자인지가 찍힙니다. 단가는 아직 샘플입니다." | p66·p15~16·p51 |

| 11 | Inspector → Purchasing | (장면 10 의 순서를 바꿔 보인다) 구매 요청을 **발주**하려 하면 막힌다 — "승인되지 않은 BOM" → Inspector 에서 **Check 요청 · BOM xxxxxxxx** → **승인** → 다시 발주하면 PO 번호가 붙는다 → **추적**을 눌러 거꾸로 따라간다 | "승인은 메모가 아니라 **그 BOM 한 장**에 붙습니다. 그래서 승인 뒤에 치수를 고쳐 다시 돌린 것은 새 BOM 이고, 옛 승인으로 나갈 수 없습니다. 발행과 발주는 승인된 BOM 에서만 되고, 이건 화면이 아니라 DB 가 막습니다. 그리고 이 구매 요청이 어느 BOM · 어느 코드 개정 · 어느 매크로 개정 · 누구의 승인에서 나왔는지 한 줄로 거슬러 올라갑니다." | p55·p56·p65 |

마무리 문장: "여기까지가 베타입니다. 다음은 회사 실 표 바인딩과 도면 확장입니다. 그 두 개는 **구조가 아니라 데이터**의 문제입니다."

---

## 3. 장애 대비

| 상황 | 대응 |
|---|---|
| dev 서버 안 뜸 | `pnpm db:up` 상태 확인 → `docker ps` 에 edim-db healthy인지. 포트 5433 충돌 시 docker-compose.yml 포트만 바꾸고 .env 동기화 |
| 첫 Run이 no-macro | `pnpm db:seed:demo` 재실행 (멱등) |
| 첫 저장이 Rev A가 아님 · 라이브 승인 전인데 매크로가 r2 이상 · e2e `S2d` FAIL | 리허설 잔재. `pnpm db:reset:demo` (멱등, 데모 테넌트 한정, admin 역할로만 삭제) → 새로고침 |
| 브라우저 dev 오버레이가 클릭 가림 | 우하단 N 아이콘 닫기. 리허설에선 `pnpm build && pnpm start`도 가능하나 발표는 dev로 검증된 경로를 쓴다 |
| 네트워크·프로젝터 사고 | `shots/` 스크린샷 7장(demo_e2e.py 산출) + `edim_sample.dxf`를 USB에 둔다. 최악엔 스크린샷으로 7장면을 그대로 진행 |
| DXF 열 프로그램 없음 | 무료 뷰어(예: LibreCAD/ODA Viewer) 사전 설치, 또는 `shots/m3_dxf_render.png` 로 대체 |

---

## 4. 질문 방어 카드

| 예상 공격 | 답 |
|---|---|
| "숫자가 진짜냐" | 아니다. 단가·배율(18%/12%)은 샘플이다. **사양은 p14 그대로**고, 단가는 `provider.ts`/`bom.ts` 상수 한 곳만 바꾸면 된다. 데이터 문제지 구조 문제가 아니다 |
| "도면이 이게 다냐" | 평면 배치 1장. 승인도·제작도·상세는 청사진 p37~44 범위이며 다음 단계다. 지금 도면은 코드의 순수 함수라는 점이 핵심 |
| "AI가 틀리면?" | 실행에 AI가 없다. AI는 설계 시점에 규칙을 쓰는 데만 쓰이고, 그 규칙은 검증·승인 후에만 실행된다 |
| "혼자 만들었나" | 설계 회장님 + 구현 AI 에이전트 협업. 테스트 147건·결정론 검증으로 품질을 보증한다 |
| "저장은 되나 (새로고침하면?)" | 된다. 조립 코드는 `code_revision`에 Rev A, B, C…로 append-only 저장(UPDATE/DELETE 권한 자체가 없음), 테넌트 RLS, 감사 로그. 화면에서 새로고침해 보여주면 끝 |
| "청사진 70장 중 얼마나 됐나" | 표면적 25~30%, 시연 등뼈 100%. 나머지 구간(CPQ 문서 템플릿·Print·PLM 도면 관리·ERP 4테이블)은 이 등뼈 위에 얹는다 |

---

## 5. 회장님 GitHub 액션 (모바일 가능 · 5분)

브랜치는 `main ← feat/m1-mainform ← feat/m2-toolbox-run ← feat/m3-output ← feat/demo-ready` 로 **적층**되어 있다.
따라서 PR은 **1건이면 된다** (m3·m2·m1 커밋이 모두 포함):

1. 탭: https://github.com/parksubeom99/EDIM/compare/main...feat/demo-ready → **Create pull request** → 제목 `beta: M1–M3 + demo-ready`
2. Files changed 훑어보고 **Merge** (Squash 말고 일반 merge — 커밋 이력 보존)
3. (선택) 토큰 `el` 편집 → **Pull requests: Read and write**, **Workflows: Read and write**. 그러면 다음부터 엘이 PR과 CI(`docs/ci/ci.yml → .github/workflows/`)를 직접 처리
4. 로컬 clone은 그 뒤 `main`으로 받아도 된다 (`--branch feat/demo-ready` 대신)

---

## 6. 이 문서의 검증 상태

- 2026-09-17 엘 샌드박스(Ubuntu · PG16 · Node 22 · pnpm 9.15)에서 §1 절차 그대로 fresh clone → 147 tests + revision:test 8/8 → `demo_e2e.py` 13/13 PASS (Tier B 포함).
- 2026-09-18 엘 샌드박스 재현(fresh clone, main a9f81dc) + 리허설 잔재 실측: e2e 2회 연속 시 Rev A~D 누적 확인 → `db:reset:demo` 추가, e2e에 잔재 탐지 단언 `S2d` 추가(14단계). reset → e2e 14/14 → (reset 없이) 재실행 시 S2d FAIL → reset → 14/14 확인.
- 회장님 Windows 로컬 실행은 **아직 0회**. §1을 회장님이 한 번 통과하는 순간이 발표 준비 완료 시점이다.
- 2026-09-21 엘 샌드박스(브랜치 `feat/p4b-document-purchase`): reset → `demo_e2e.py` **87/87**(S22~S26 = 견적·Tech Data·구매 요청 18단계 추가). 장면 10 의 화면 3장(Document 탭 · Purchasing · 견적서 인쇄본)은 스크린샷을 눈으로 확인했다. **회장님 Windows 로컬 실행은 여전히 0회.**
- 2026-09-21 엘 샌드박스(브랜치 `feat/p6-approval-binding`): `demo_e2e.py` **99/99**(S27~S29 = 승인 묶기·발행/발주 문·추적·Accepted 12단계 추가). e2e 의 고정 sleep 3곳을 "상태가 바뀔 때까지 대기"로 바꿨다(첫 호출의 라우트 컴파일이 느리면 헛눌림). **회장님 Windows 로컬 실행은 여전히 0회.**
