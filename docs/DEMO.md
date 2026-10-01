# EDIM 베타 — 발표 절차서 (v5, 2026-09-21 · P3-a·P4-a·P4-b·P6 반영)

> 목적: 회장님이 **자기 노트북에서** 베타 1수직을 직접 띄우고, 7장면으로 시연하고,
> 질문에 방어하는 전 과정. 이 문서 하나로 준비 → 리허설 → 발표가 끝나야 한다.
> 방향 기준: EDIM.pdf 70장(NOVA 청사진). 시연은 그 중 **등뼈 한 줄**(코드 → Run → BOM·원가·도면)이다.

> ### ⚠️ 시연은 운영 모드로 한다 (ccmd M-1 · 2026-09-30)
> **기본 = 운영 모드**(아래 0-A 절 — `next start` 또는 docker 킷). 개발 모드(`pnpm dev`)는 **예비 경로**다.
> 이유: 09-30 실측에서 개발 서버(node) 가 한 세션 동안 **16 GB** 까지 불었고, 그 순간 화면 응답이 1.5초를 넘겨 e2e 가 흔들렸다. 시연 중 같은 일이 나면 화면이 멎는다.
> 개발 모드로 시연할 수밖에 없으면 **시연 직전에 개발 서버를 껐다 켠다**(1절 끝).

---

## 0. 발표 한 문장

"제품 코드 한 줄을 고르면, 승인된 규칙이 실행돼서 BOM·원가·도면이 **같은 입력에 항상 같은 답**으로 나옵니다. 실행에는 AI가 없습니다."

---

## 0-A. 시연 경로 — 운영 모드 (기본)

둘 중 하나. 리허설 뒤 초기화가 쉬운 **(가)** 를 권한다.

**(가) 로컬 운영 모드 — `next build` → `next start`** (개발 DB 5433 · `db:reset:demo` 가 된다)

```powershell
cd C:\dev\EDIM
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:reset:demo
pnpm build
pnpm --filter @edim/web start
```

- 브라우저 http://localhost:3000/login — `owner@acme.test` / `edim-demo-2026`(공개 데모용 샘플 값). 운영 모드라 비밀번호 로그인만 된다.
- 리허설 뒤 초기화: 서버를 끄지 않아도 된다 — 다른 터미널에서 `pnpm db:reset:demo`.
- 코드를 바꿨으면 `pnpm build` 부터 다시(운영 모드는 빌드된 것만 돈다).

**(나) docker 운영 킷 — 한 줄** ([`DEPLOY.md`](DEPLOY.md) 1 · 6절)

```bash
export AUTH_SECRET=$(openssl rand -base64 32)
docker compose -f docker-compose.prod.yml up -d --build
```

- 초기화는 `db:reset:demo` 가 아니라 `docker compose -f docker-compose.prod.yml down -v` 뒤 다시 `up -d --build`(샘플 데이터를 새로 넣는다 — 볼륨의 데이터는 지워진다).

아래 1절(개발 모드)은 **예비 경로**다.

---

## 1. 예비 경로 — 개발 모드 로컬 준비 (Windows · 최초 1회 · 약 20분)

> **예비 경로다.** 시연은 0-A(운영 모드)로 한다. 개발 모드로 시연해야 하면 **시연 직전 개발 서버를 재시작**한다(`Ctrl+C` → `pnpm dev` → 첫 화면이 뜰 때까지 한 바퀴 눌러 둔다).

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
pnpm dev                   # http://localhost:3000  — 예비 경로(시연 직전 재시작)
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
python scripts\demo_e2e.py http://localhost:3000 shots   # ★ 116/116 PASS면 발표 가능
pnpm db:reset:demo         # ★ e2e 자신도 흔적을 남긴다 → 시연 직전 반드시 한 번 더
```

`demo_e2e.py`가 116/116이면 아래 시연 11장면은 **기계적으로 재현이 보장된** 상태다.

**리허설 잔재 규칙** — `code_revision`은 append-only라 앱에서 지울 수 없다. e2e·`revision:test`·손 리허설을 한 번이라도 돌린 DB에서는 본 시연의 첫 저장이 "Rev A"가 아니라 "Rev C/E…"로 찍히고, 매크로도 시드된 r1 이 아니라 r2+ 로 보인다. e2e의 `S2d`가 이 상태를 FAIL로 잡아준다.

**발표 당일 아침 순서 (이 순서 그대로):** `docker ps` healthy → `pnpm db:reset:demo` → `demo_e2e.py` 116/116 → **`pnpm db:reset:demo` 한 번 더** → 브라우저 강력 새로고침(Ctrl+Shift+R) → 이후 시연 시작 전까지 화면 클릭·저장 금지.

---

## 2. 시연 대본 — 11장면 (약 16분) + 추가 장면 12 · 13 (2026-09-29 · 학습 AI · Special 팬 선정)

로그인: `owner@acme.test` · 비밀번호 `edim-demo-2026` (샘플 계정 · 공개 데모용 값 — p11 · 0032).

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

| 9 | Design 탭 ↔ Set-Up ↔ BOM ↔ Purchasing | BOM Run 뒤 **평면 DXF** 를 열어 폭을 본다 → Set-Up 의 **치수 표 한 칸**(55행 W) 2472→2600 과 **cap 표 filterQty** 18→20 을 고치고 **저장 1회** → 다시 BOM Run → 필터 두 줄 수량 **20**, Cost 가 늘어난 재료비 × 1.18 × 1.12 만큼 오르고, 새 DXF 폭이 **2600**, 새 구매 요청의 필터 수량 **20** → 옛 스냅샷의 구매 요청은 **18 그대로** → 옛 스냅샷으로 도면을 다시 그리려 하면 **409**("등록 표가 바뀌었습니다") → 표를 되돌리면 옛 도면이 원래 폭으로 다시 나온다 | "코드는 그대로입니다. 표의 칸 하나가 바뀌면 BOM·원가·구매 수량·도면이 **함께** 바뀌고, 앞 스냅샷은 그대로입니다. 그리고 표가 바뀐 뒤에는 옛 스냅샷으로 새 치수의 도면을 만들 수 없습니다 — 승인 안 된 치수가 옛 승인으로 나가지 않습니다. 이건 화면이 아니라 서버·DB 가 막습니다. (단서: 단면 치수는 아직 cap.face 와 dim.W 두 칸에 있어 BOM 사양 문자열은 옛 값을 보입니다 — 설계 결정 대기.)" | p38~40·p24·p65 · e2e S30 |

| 10 | Document 탭 → 인쇄본 → Purchasing | BOM Run 뒤 **견적서 등록** → 문서 번호(QR-61313-01 Rev A)를 눌러 **인쇄본**을 연다 → **원가**(Cost 카드 · PCR Full cost) **₩15,487,170** 과 **견적** 합계 **₩17,035,887**(= 원가 × 1.1 · 마진율 10% **샘플**)을 구분해 같이 본다 · 아래 **PCR 세부** 표 밑 '원가 기준' 한 줄 → **Tech Data 등록** → **구매 요청 만들기** → 상단 메뉴 Purchasing 에서 **→ 견적 요청 → 발주**(PO 번호가 붙는다) → **Export CSV** 를 엑셀로 연다 | "견적·기술 자료·구매 요청이 전부 **같은 BOM 한 장**에서 나옵니다. 원가 ₩15,487,170 은 다시 계산한 값이 아니라 그 BOM 에 저장된 원가 그대로라서 **한 원도 다를 수 없고**, 견적 ₩17,035,887 은 그 원가에 **마진율 10% 를 곱한 값**입니다 — 마진율은 **샘플값**이고 회사 요율표 파일 한 줄만 바꾸면 다음 견적부터 바뀝니다. 구매 요청에는 그 BOM 에서 사 오는 품목만 들어오고, 같은 BOM 으로 두 번 살 수 없습니다. 발주된 것은 DB 가 수정을 거부합니다. 인쇄본 발치에는 어느 BOM·어느 코드 개정·어느 매크로 개정에서 나온 숫자인지가 찍힙니다. 단가는 아직 샘플입니다." | p66·p15~16·p51 |

| 11 | Inspector → Purchasing | (장면 10 의 순서를 바꿔 보인다) 구매 요청을 **발주**하려 하면 막힌다 — "승인되지 않은 BOM" → Inspector 에서 **Check 요청 · BOM xxxxxxxx** → **승인** → 다시 발주하면 PO 번호가 붙는다 → **추적**을 눌러 거꾸로 따라간다 | "승인은 메모가 아니라 **그 BOM 한 장**에 붙습니다. 그래서 승인 뒤에 치수를 고쳐 다시 돌린 것은 새 BOM 이고, 옛 승인으로 나갈 수 없습니다(옛 스냅샷으로 새 치수의 도면을 그리는 것도 409 로 막힙니다 — 장면 9). 발행과 발주는 승인된 BOM 에서만 되고, 이건 화면이 아니라 DB 가 막습니다. 그리고 이 구매 요청이 어느 BOM · 어느 코드 개정 · 어느 매크로 개정 · 누구의 승인에서 나왔는지 한 줄로 거슬러 올라갑니다." | p55·p56·p65 |

| 12 | Platform Console → 학습 AI → 작업대 Toolbox | (2026-09-29 추가 · ccmd J) `platform@edim.test` 로 로그인 → `/platform/learning` — 원천 표의 **샘플** 표지(도면 68 · 기술문서 1) → **작업 만들기 · 실행** → 단계표 extract · align · mine · verify 완료 → 공식 후보 3장(전장 = Σ 구획 · 전고 = 케이싱 + 2 × 프레임 · 코일 깊이 = 25 × 열수 + 50)과 적합도 → 전장 카드 **승인** → 회사 **Acme AHU** 고르고 **투영 →** → 구조 유사도 계기판 **1.00 / 목표 0.90** → 회사 계정 작업대 AHU-01 → Toolbox **Program Tool** 의 **학습 제안** → **채택** → **Save draft** → **승인** → **Run**(값 = 구획 합) | "플랫폼이 도면·기술문서를 **플랫폼 쪽 DB 에만** 올려 숨은 공식을 찾습니다. 공식은 결정론으로 찾고, 로컬 AI 는 사전 밖 이름 맞추기만 돕습니다. 사람이 승인한 공식만 회사 쪽으로 **한 방향으로** 내려가고, 회사는 자기 매크로 승인을 한 번 더 거쳐야 씁니다. 회사 자료는 플랫폼으로 거꾸로 올라가지 않습니다 — DB 권한이 막습니다. 지금 자료는 전부 샘플입니다." | p21·p23 · e2e S72a~h |
| 13 | Company Info. → Platform Console → 작업대 Toolbox | (2026-09-29 추가 · ccmd J) 회사가 Set-Up ▸ UI Design 에서 만든 입력 폼(Number 위젯: 풍량 CMH · 기외정압 Pa · 밀도 kg/m³)을 붙여 `/m/company` 에서 Special 의뢰(프로그램 **팬 선정**) → **플랫폼에 의뢰** → `platform@edim.test` 의 `/platform/special` 에서 **승인 + 부여** → 회사 작업대 Toolbox 에 **Special: 팬 선정** 탭이 생긴다 → 풍량 **12000** · 기외정압 **600** → **실행** → **EDIM-PF-560 (샘플) · 2600 rpm · 모터 3.7 kW** · 동작점 11,844 CMH · 585 Pa · 효율 73.6 % → "오늘 1회 · 요금 합계 5,000 KRW(샘플)" → 플랫폼 과금 표 1회 · 5,000 | "Special 은 플랫폼이 부여한 회사에만 버튼이 생깁니다. 입력 화면은 회사가 직접 만든 폼 그대로이고, 계산은 서버 결정론입니다. 회사는 팬 성능표 원자료를 받지 않고 교점 구간만 받으며, 플랫폼은 사용 기록의 **금액 칸만** 봅니다. 성능표와 단가는 샘플입니다." | p21·p25 · e2e S74a~f |

마무리 문장: "여기까지가 베타입니다. 다음은 회사 실 표 바인딩과 도면 확장입니다. 그 두 개는 **구조가 아니라 데이터**의 문제입니다."

---

## 3. 장애 대비

| 상황 | 대응 |
|---|---|
| dev 서버 안 뜸 | `pnpm db:up` 상태 확인 → `docker ps` 에 edim-db healthy인지. 포트 5433 충돌 시 docker-compose.yml 포트만 바꾸고 .env 동기화 |
| 첫 Run이 no-macro | `pnpm db:seed:demo` 재실행 (멱등) |
| 첫 저장이 Rev A가 아님 · 라이브 승인 전인데 매크로가 r2 이상 · e2e `S2d` FAIL | 리허설 잔재. `pnpm db:reset:demo` (멱등, 데모 테넌트 한정, admin 역할로만 삭제) → 새로고침 |
| 브라우저 dev 오버레이가 클릭 가림 | 우하단 N 아이콘 닫기. 리허설에선 `pnpm build && pnpm start`도 가능하나 발표는 dev로 검증된 경로를 쓴다 |
| 네트워크·프로젝터 사고 | `shots/` 스크린샷 26장(demo_e2e.py 산출 · `docs/screens/` 에 webp 사본) + `edim_sample.dxf`를 USB에 둔다. 최악엔 스크린샷으로 11장면을 그대로 진행 |
| DXF 열 프로그램 없음 | 무료 뷰어(예: LibreCAD/ODA Viewer) 사전 설치, 또는 `shots/48_dxf_plan.png`·`49_dxf_assembly.png` 로 대체 |

---

## 4. 질문 방어 카드

| 예상 공격 | 답 |
|---|---|
| "숫자가 진짜냐" | 아니다. 단가·배율(18%/12%)은 샘플이다. **사양은 p14 그대로**고, 단가는 `provider.ts`/`bom.ts` 상수 한 곳만 바꾸면 된다. 데이터 문제지 구조 문제가 아니다 |
| "견적이 원가랑 왜 다르냐 · 마진율은?" | 원가 ₩15,487,170(BOM 스냅샷 · 불변) × (1 + 마진율 10%) = 견적 ₩17,035,887. **마진율 10% 는 샘플값**(회사 마진 정책 확정 전 · 회장님 결정 09-30 · 한 줄 유지)이고 요율표 파일(`pcr-rules.local.json`)의 `marginPct` 만 바꾸면 다음 견적부터 반영된다. 이미 낸 견적은 그대로다 |
| "PCR 세부의 EBIT(₩2,193,185)가 견적 − 원가(₩1,548,717)보다 큰 이유" | 원가 기준이 다르다. PCR 세부는 스냅샷 **재료비 + 인건비 ₩13,827,830** 에서 출발해 간접비를 요율표 줄(조달·판관·일반관리 등)로 **항목별로 다시 센다**. 스냅샷 원가의 Overhead(12% 일괄 ₩1,659,340)는 넣지 않는다 — 넣으면 간접비가 두 번 들어간다. 표 밑에 이 기준이 한 줄로 찍혀 있다. 요율도 샘플이다 |
| "도면이 이게 다냐" | 평면도·조립도(Item 표+풍선번호) 2종, 선과 글자 수준. 승인도·제작도·상세는 청사진 p37~44 범위이며 다음 단계다. 지금 도면은 스냅샷의 순수 함수이고 번호·개정·발행 잠금이 있다는 점이 핵심 |
| "AI가 틀리면?" | 실행에 AI가 없다. AI는 설계 시점에 규칙을 쓰는 데만 쓰이고, 그 규칙은 검증·승인 후에만 실행된다 |
| "혼자 만들었나" | 설계 회장님 + 구현 AI 에이전트 협업. 단위 테스트 357건 · DB 검증 13종(RLS·append-only·발행/발주 잠금·플랫폼 열람 차단·음수 재고) · 발표 시나리오 e2e 404단계(운영 킷 대상 401 · 호스트 전용 3단계는 출력에 SKIP 표시)로 품질을 보증한다 |
| "저장은 되나 (새로고침하면?)" | 된다. 조립 코드는 `code_revision`에 Rev A, B, C…로 append-only 저장(UPDATE/DELETE 권한 자체가 없음), 테넌트 RLS, 감사 로그. 화면에서 새로고침해 보여주면 끝 |
| "청사진 70장 중 얼마나 됐나" | 구현 대상 51장 중 실동 44(그중 샘플 자료로 도는 5) · 부분 7 · 미착수 0(ccmd P 규칙 R · CC 초안 — 엘 재측정 전 · `docs/00-corpus/page-map.md` 에 쪽마다 근거). 부분 7 = p9 클라우드 · p21 회사 자료 원천 · p23 실도면 · p38 부품도 · p42 3D 2D CAD Mapping · 체결 부품 · p44 구매 · 물류 · 보관 기준 · p58 Free CAD — 전부 외부 입력 대기. 시연 등뼈(코드 → BOM → 도면·견적·Tech Data → 구매 → 승인 → 추적)는 끝까지 돈다. (09-22 표현 "가장 큰 빈 곳 Arrangement · Drawing Data Set-Up"은 ccmd J~N 으로 닫혔다) |

---

## 5. 회장님 GitHub 액션 (Windows PC · 5분)

지금 열린 브랜치는 **`feat/p6-followup`** 하나(main 은 P6 까지 머지됨). 검증 2종 수리 · S30 변경 전파 시나리오 · 도면 지문 가드가 들어 있다.

1. 탭: https://github.com/parksubeom99/EDIM/compare/main...feat/p6-followup → **Create pull request** → **Merge**(ff 가능)
2. `git pull` → `pnpm db:generate && pnpm db:migrate` → §1 확인 블록 → 116/116 이면 회장님 PC 첫 실측
3. `docs/ci/ci.yml` 을 `.github/workflows/ci.yml` 로 복사해 커밋(엘 토큰은 Workflows 권한 403)

---

## 부록 K — 새 장면 후보 (2026-09-30 · ccmd K · 본 장면 번호 1~13 그대로)

| 후보 | 화면 · 조작 | 멘트 요지 | 근거 |
|---|---|---|---|
| K-1 CPQ 가 팬을 고르는 BOM Run | 작업대 AHU-01 → Code Builder **SPF(샘플)** · 55 → BOM → **BOM Run** → BOM 표 위 "Special 팬 선정 EDIM-PF-560 (샘플) · 2600 rpm · 모터 3.7 kW" · 팬 · 모터 줄 · 원가 → DWG View **조립도** Item 표에 팬 모델 · 모터 kW | "풍량 · 정압을 다시 치지 않습니다. 제품 코드에 등록된 값으로 BOM Run 이 팬을 고르고, 결과가 스냅샷에 박혀 원가 · 견적 · 도면이 같이 따라옵니다. 과금은 BOM Run 한 번에 한 건입니다." | e2e S75a~f · 캡처 75_cpq_special_bom · 75_cpq_special_drawing |
| K-2 세부 치수와 설계 심볼 | 같은 스냅샷 → DWG View **조립도** → 세부 치수선(detail.Fan.A=1250 …) · 부품 mm 좌표 · KAD- 슬롯 줄(샘플) → 오른쪽 Item 표 줄 또는 풍선번호 **더블클릭** → 부품 정보(공급처 · 단가 출처 · 조립순서 · 주의사항) → 도면 등록 후 `/drawings/{id}/annotate` → **설계 심볼**(팬 · 모터 …) 놓기 · 옮기기 · 90° · 지우기 | "세부 치수 · 배치 좌표는 CAD 규칙서 파일 한 장(샘플)에서 옵니다. 파일을 바꾸면 코드 수정 없이 다음 도면이 바뀌고, 앞서 뜬 도면은 그대로입니다. KAD 슬롯 문법은 아직 샘플 대응표입니다." | e2e S76a~e · S77a~c · S78a~c · 캡처 76_detail_dim · 77_symbol · 78_part_info |
| K-3 컨설팅 두 트랙 | `/m/consulting` → 트랙 1 제안(공급처 차액 · 설계 여유 3.8%) · **인쇄본(A4)** → 트랙 2 "업계 안 우리 위치"(표본 n 곳 · 샘플 · p25~p75 막대 · 우리 값 · 백분위) | "우리 회사 스냅샷만 분석합니다. 업계 비교는 DB 함수가 숫자만 주고, 다른 회사 이름이나 행은 오지 않습니다. 표본이 3곳 미만이면 아예 보여 드리지 않습니다. 단가 · 운전시간 · 표본은 샘플입니다." | e2e S79a~e · consulting:test · 캡처 79_consulting_internal · 79_consulting_benchmark |

## 부록 L — 새 장면 후보 (2026-10-01 · ccmd L · ccmd N · 본 장면 번호 1~13 그대로)

| 후보 | 화면 · 조작 | 멘트 요지 | 근거 |
|---|---|---|---|
| L-1 생산 흐름 | `/m/mrp` 프로젝트 수량 2 · 납기 → 표(총소요 · 재고 · 순소요 · 시기) → **구매 요청 초안** · **작업지시 초안** → `/m/work-orders` 지시 → 공정 2 를 먼저 누르면 409(앞 공정) → 1 → 2 → 3 · 완성품 검수 없이 완료 409 → `/m/quality` 검수 합격 → 완료 · 재고 소모 → `/m/capacity` 빨간 칸 | "BOM 스냅샷 하나에서 구매 · 작업지시 · 재고까지 사람이 다시 치지 않습니다. 순서를 어기면 DB 가 거부합니다. 작업장 · 작업자 · 창고는 샘플입니다." | e2e S84~S88 · `92_mrp` · `93_work_order` · `94_capacity` |
| L-2 모바일 · QR | 휴대폰 폭으로 `/mobile` → 승인 · 대화 · 입고 · 검수 · 공지 → 작업지시서 인쇄본의 QR 을 찍으면 `/q/…` = 도면 · 서류 · 이력 · 할 일(로그인 · 같은 회사만 · 폐기 410) | "현장에서는 QR 하나로 그 일의 도면과 할 일을 봅니다. 다른 회사 QR 은 열리지 않습니다." | e2e S89 · S90 · `96_mobile_approve` · `98_qr_page` · `99_work_order_qr` |
| L-3 설계 우선순위 | `/setup/design-priority` (SPF 샘플) — 표(Dim · 우선순위 · 상위설계 · 기준점 · 오류 체크) → 위반을 만들면 "바꿀 후보 L → H · W 는 바꾸지 말 것" | "치수가 부딪히면 무엇부터 바꿀지 시스템이 순서를 냅니다. 판정은 기존 설계 검증 규칙 그대로입니다." | e2e S91 · `89_design_priority` |
