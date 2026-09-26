# 청사진 페이지 색인 — 70장의 지금 (main `77cd11f` · 2026-09-27)

> 이 파일은 `docs/02-reports/build_blueprint_match.py` 의 판정 데이터에서 **자동 생성**된다. 손으로 고치지 말 것.
> 실동 18 · 부분 28 · 미착수 5 · 개념·표지 19 (합 70). 판정은 엘의 것 — 회장님 조정 대상.

## System concept (p1–9)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p1 | 개념·표지 | CTO Business Platform — EDIM | CPQ + PLM + ERP + D.T 통합이라는 정체성은 repo README 첫 문장과 발표 덱의 출발점이다 | — | — |
| p2 | 개념·표지 | System concept | — | — | — |
| p3 | 개념·표지 | CTO Business — As-is / To-be | "제품 Configuration 선정과 동시에 모든 업무 자료 생성" — 코드 한 줄에서 BOM·도면·원가·견적·Tech Data·구매 요청이 한 BOM 스냅샷으로부터 나오는 것까지 얇게 실증 | 수작업 입력·오류가 실제로 줄었는지는 회사 실 데이터로 재 본 적이 없다 | — |
| p4 | 개념·표지 | System Integration — 생성 자료 5종 | BOM / Part List ✓ · Tech Data ✓(Input Data 템플릿 값 포함) · DWG 2D ✓(뷰 여섯 종 · 용도별 승인도·제작도·견적도) · Cost ✓(단가 이력)<br>DWG 3D — 브라우저 3D 뷰어가 같은 BOM 스냅샷의 구획 박스(길이 × 단면)를 돌려 본다(⑩ · 새 데이터 없음) | 실제 형상 모델(glTF) 없음 — 3D 는 구획 박스와 부품 칸 표시까지<br>Work Process 산출 없음<br>ERP 연계는 구매 요청까지 · Smart Factory·AR/XR 은 EDIM 완료 후 확장 단계(회장님 확정) | e2e S51a~d · S39 |
| p5 | 실동 | Real-Time Code connectivity — 코드 한 줄이 회사를 관통한다 | 제품 선정(Code 생성) → Part-List(Code 연결) → DWG(Code 기반) → Cost → 견적 → 구매 요청이 끊기지 않고 이어진다<br>연결 장부 14고리 중 이어짐 12 · 약함 0 · 없음 2 | Product(Code QR) · Manufacturing/MES 고리 없음<br>남은 '없음' 2: DB①→DB②(P3-b · DXF 연구 후) · Special(P3-c · D1 후) | docs/plan/connection-ledger.md · e2e S8 · S18c · S22b · S24a · S28a |
| p6 | 개념·표지 | EDIM System 구성 | MainForm 상단에 CPQ · PLM · ERP · EDIM Toolbox, 별도 Set-Up(Code System) 화면이 실제로 있다 | GUI Toolkit Canvas · EDIM Chart · Template 없음<br>Product DB 의 [AI 학습] 갈래는 구조만(DB① 비어 있음) | — |
| p7 | 개념·표지 | EDIM 효과 | 1. 제품 선정과 동시에 생성되는 자료 4종(BOM·도면·기술 자료·견적서)은 모두 화면에서 나온다(깊이는 p17 참조) | 2. 경영 효과 · 3. Set-up 시간 20% 는 주장이다 — 재 본 값이 없다 | — |
| p8 | 개념·표지 | 기존 System 대비 — 시스템 정의 50 / 고객 구현 40 / EDIM 지원 10 | 3계층으로 반영: 회사가 자기 코드·표·매크로를 직접 고치고(셀프서비스), 플랫폼으로 올라오는 것은 Special 의뢰 한 통로뿐 | 50/40/10 비율은 실제 Set-up 을 해 본 적이 없어 검증되지 않았다 | e2e S10b · S16a~S16j |
| p9 | 부분 | Web-based Application · Cloud-based Data Management | 웹 애플리케이션(Next.js) ✓<br>고객사 격리를 Postgres RLS 로 강제 · 플랫폼 계정은 고객사 업무 데이터를 DB 권한상 못 읽는다 | 클라우드 배포 0회 — 지금은 로컬 docker + 엘 샌드박스뿐<br>Self-managed Servers 선택지 없음 | rls:test · platform:test 25 · e2e S16g |

## Product Selection (p10–18)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p10 | 개념·표지 | Project Registration ▶ Product Selection ▶ Document ▷ ERP | 이 네 단계가 얇게 한 줄로 이어져 돈다: 프로젝트 노드 → 코드 조립 → BOM·도면·견적·Tech Data → 구매 요청 | — | e2e S1 → S2 → S6 → S25 → S26 |
| p11 | 부분 | 로그인 | 이메일 로그인 → 세션 → 테넌트 결정 → 역할(RBAC) 가드 ✓<br>권한 없는 역할의 등록 시도는 403 | 비밀번호가 없다 — 베타용 최소 인증(화면에 'sign in (dev)'라고 적혀 있다)<br>NOVA Solution 브랜딩 · SSO 없음 | auth 테스트 PASS · e2e S0 · S11 |
| p12 | 부분 | 프로젝트 등록·관리 | /m/project — 등록(Registration Process) · 헤더(Type·Client·담당자·Remarks·Description) 수정 · 영업 단계 전이 · 접수 자료(File) 등록·내려받기(②)<br>Client 를 Company DB 고객 목록에서 고르면 id 와 이름이 함께 남는다(⑧ · 옛 글자 데이터 보존)<br>Schedule management 는 작업대 Inspector 에서 돈다(p18) | Client 담당자 여러 명 · 영업 활동 이력 없음<br>고객 목록 수정·삭제 없음 | project:test · e2e S42 · S49b |
| p13 | 부분 | Selection Template | Product Code 표시 · BOM / EDIM Run / Quotation·PCR / Drawing 버튼과 목록 ✓<br>Arrangement 개념도 = 등록된 구획(하드코딩 아님) — 활성 구획이 폭 비례로 그려진다<br>Arrangement 편집이 돈다: 구획 길이 · 순서(Move) · 추가(Add) · 삭제(Delete) · 방향(L0~R270) · 부품 배치를 고쳐 저장하면 다음 BOM 의 도면이 그대로 따라온다<br>Schedule management(To-do·Done·기한·승인 요청 목록)가 Inspector 에 들어왔다 | Sub Item list · DWG View(뷰어) 없음 — p58 툴바의 DWG View ▼ 는 DXF 를 내려받을 뿐 화면에 띄우지 않는다 | e2e S21a · S21b · S31a~h · S32a~h · S36a~c · S38a~f |
| p14 | 실동 | 사양표 — 우리 제품의 말로 | BOM 의 사양 열이 p14 문구 그대로 나온다(Base Frame · Casing · Fan · Coil · Damper) | '다단계 Option 추적' 은 슬롯 조건(when) 한 단계 수준 | e2e S6a |
| p15 | 부분 | Technical Data | Tech Data 문서 1종: 결과값 + 그 값을 낸 승인 매크로 개정·원문 + 입력 슬롯, 번호·개정·상태·발행 잠금 | Import · Technical data 목록 없음 (방향 L0~R270 은 Arrangement 에서 등록된다 — p36)<br>매크로 결과 1값뿐 — 기술 계산서 수준이 아니다 | e2e S23a · S23b · document:test 28 |
| p16 | 부분 | Document Template · Edit Table | Edit Table = Set-Up 의 제품 코드 표 편집 ✓ — 한 칸을 고치면 BOM·매크로·도면이 따라 바뀐다<br>Output Data 인쇄 ✓<br>Input Data 템플릿(⑨) — 회사가 항목(Temperature °C · Humidity % …)의 단위·기본값·범위를 정하고, Tech Data 를 만들 때 값을 받아 문서에 스냅샷으로 남긴다(범위 밖 400) | Output Data 계산(청사진의 밀도 kg/m³) 없음 — 매크로 연결이 필요하다<br>그래프 · Table Type Variant·Material · Data Up-Load 없음 | e2e S10b · S10d · S18b · S50a~d |
| p17 | 실동 | 네 가지 산출물 — BOM · Quotation · Document · Drawing | 네 가지 모두 화면에서 나오고, 모두 같은 BOM 스냅샷 하나를 입력으로 받는다<br>문서·도면은 번호·개정(A→B)·상태 4단계·발행 잠금<br>도면 용도별 구분(⑦) — 승인도(-APV)·제작도(-MFG)·견적도(-QTN) 로 번호·개정이 따로 가고, 발행 뒤에는 용도도 못 바꾼다 | '준비시간 1시간 이내' 는 재 본 적 없다<br>용도별로 도면 내용(치수 깊이 · 표제란)이 달라지지는 않는다 — 지금은 분류와 번호다 | e2e S25b · S19a~S19e · S22d · S48a~d |
| p18 | 부분 | 작업 화면 틀 — Hierarchy · Approval · Schedule | Hierarchy · Description · Approval(BOM 에 묶인 단계 요청) ✓<br>Schedule management ✓ — To-do list · Done items · 기한(지나면 '지남') · Approval Request List 가 작업대 안에서 돈다 | Data Up-Load 없음 | e2e S1 |

## System tool (p19–28)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p19 | 개념·표지 | Detail Process | — | — | — |
| p20 | 개념·표지 | System tool — 사용자가 직접 필요한 System Customizing | — | — | — |
| p21 | 부분 | UI Tool · Program Tool · 학습 DB | MainForm 옆에 뜨는 플로팅 창 · UI Tool / Program Tool 탭 · 드래그·도킹·상태 유지 ✓<br>Program Tool: Prompt · Macro · Flowchart · Description · Coding 다섯 갈래 | UI Tool 은 Command button 한 가지뿐(→ p25)<br>3. 사내 정보 학습 DB화 없음(P3-b) | e2e S13a · S15a~S15c |
| p22 | 실동 | ① Data Set-up → … → ⑥ Programming → ⑦ 검증·승인 | ① 표 등록 → ③ Item 호출 → ④ 작업 대상 호출 → ⑤ Toolbox 호출 → ⑥ 매크로 작성 → ⑦ 검증·승인이 이어져 돈다<br>Toolbox 의 Run 이 곧 MainForm 의 Run(같은 값) | ② 사용자 제작 UI 는 Command button 수준 | e2e S13a~S13f · S4a~S4c |
| p23 | 미착수 | AI 학습 자료 DB — 도면·문서 학습 | — | DB①(platform 스키마)은 구조만 있고 비어 있다<br>메타데이터 추출(하) · 2D 도면 객체 이해(중) · 3D 형상(상) 어느 단계도 없다 | e2e S16f(DB① 비어 있음을 단언) |
| p24 | 실동 | Projects · Drawings · Revisions | Revisions: 개정 번호(A,B,…)·사유·개정자, append-only(앱 역할에 UPDATE/DELETE 권한 없음)<br>개정 = 슬롯 A~F 전체 코드(2026-09-22 회장님 결정) — F 가 붙은 실행도 자기 근거 개정으로 추적된다<br>Drawings: 번호·유형·현재 개정·상태(작성중/검토/승인/발행), 발행은 DB 트리거가 잠근다 | Parts · BOM · Material 테이블은 코드 카탈로그 + BOM 스냅샷 구조로 대체(GAP1 결정)<br>scale · size 열 없음 | revision:test · drawing:test 18 · e2e S2b~S2d · S19 · S28e |
| p25 | 부분 | 사용자 UI Form — Command button · Combo box · Templet | Command button set-up ✓ — 보이기·순서 변경이 MainForm Action Bar 에 즉시 반영, 기본값 복원<br>UI Form(④) — Combo box(=Sub Code) · Table(=제품 표) · Button(찾기·초기화·복사) 을 끌어다 놓고 Set-up, Templet 호출 = 복사해 고치기, Run 은 실제 카탈로그 데이터 | UI 개발 AI(설명을 주면 UI 자동 설계) 없음<br>Form 을 MainForm 작업 흐름에 끼워 넣는 연결은 Toolbox 링크까지 | e2e S14a · S14b · S44a~f |
| p26 | 부분 | UI Design 작업장 | /setup/ui 작업장(④) — 팔레트에서 24×16 캔버스로 끌어다 놓기(겹침 없는 자리 자동) · 위젯별 Set-up · Sample Templet 호출(복사) · 저장·Run | Work Hierarchy 노드별로 다른 UI 를 붙이는 연결 없음<br>UI 개발 AI 없음 | e2e S44a~f |
| p27 | 실동 | 매크로 — 제안 → 검토 → 승인 | Verify(정적 검증 + dry-run) → 초안 → 승인 → revision 상승, 승인본만 공식 Run<br>Table 참조 · Flowchart · Description(결정론 역번역) ✓ | Prompt → Macro 는 경로만 있고 실모델 호출 0회(API 키 없음)<br>함수 마법사 · 그래프 마법사 · Address 찾기 없음 | macro:test 10(첫 승인 r1 · 반려는 번호 소비 안 함 — 09-21 수리) · e2e S4a~S4c · S13b~S13f |
| p28 | 부분 | 도면 풍선번호 · Item 표 · KAD-□□□ 슬롯 | 조립도에 Item 표와 풍선번호가 들어간다 | 부품 더블클릭 정보 관리 없음<br>KAD-□□□ 슬롯 ↔ Key Dimension 대응 문법 미정<br>조립순서·주의사항 없음 | e2e S18f |

## BOM Code Set-Up (p29–36)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p29 | 개념·표지 | BOM Code Set-Up — 관계형 BOM Code / RCCS™ | — | — | — |
| p30 | 부분 | 여섯 가지 등록 | Sub Code ✓ · Product code ✓ · Product Code Relationship ✓ | Material code & Purchase items 는 제품 코드 종류(kind=purchase) 로만 존재<br>Arrangement code · Arrangement Drawing Control 없음 | e2e S9a · S9b · S10a |
| p31 | 실동 | Sub Code Registration | 그룹·항목·값을 등록하면 MainForm Code Builder 드롭다운에 바로 나타난다 | Approval Status · 3D/2D DWG 첨부 없음 | e2e S9a · S12a · S12b |
| p32 | 부분 | 자재·구매 품목 코드 등록 | /setup/material 전용 화면(⑤-a) — 구매품 코드 분류 트리 · Registered Code Table(A:Supplier · V · Hz · IP · Insulation · Efficiency) 이 기존 제품 코드 API 로 한 표를 고친다 · 새 자재 코드<br>G:Price 단가 이력(p67) — 고치지 않고 쌓는다 · 현재 = 오늘까지 유효한 최신 · 미래 = 예정 · 공급처를 Company DB 목록에서 고른다(⑧)<br>등록한 공급처가 BOM Run 때 스냅샷 줄에 박히고 구매 요청이 그대로 받는다(S34) | 코드별 Approval Status · DWG(3D/2D) 첨부 없음<br>이 단가가 BOM 원가에 자동 반영되지는 않는다 — 원가는 여전히 코드 관계의 한 값 | e2e S34a~d · S45a~e · S49c |
| p33 | 실동 | Product Code + 표 | 제품 코드와 그 표(tech · dim) 등록·편집 ✓<br>표를 고치면 BOM · 매크로 · 도면이 따라 바뀐다 | 3D/2D DWG 첨부 · Data Up-Load 없음 | e2e S10a · S10b · S10d |
| p34 | 실동 | Child Group — 코드 관계가 곧 BOM | Child Group · Q'ty · 조건 · 코드 상속(p34) ✓ · Part List Running Test ✓<br>BOM 은 슬롯 규칙 함수가 아니라 등록된 관계를 돌린 결과다 | 다단 BOM(하위의 하위) 없음 | e2e S8 · S9b~S9d · 회귀 1,200 조합 · backbone:test 13 |
| p35 | 부분 | Arrangement 코드 등록 | /setup/arrangement-code(⑤-b) — 제품의 지금 배치(구획 순서·길이·방향·부품 위치)를 이름 붙여 스냅샷 등록 → owner 승인/반려(한 번뿐) → 승인된 것만 제품에 적용(기존 Arrangement 저장 규칙 그대로)<br>구획 길이·순서·방향·부품 칸은 Design 탭 편집 패널과 툴바(p58)에서도 같은 저장 한 곳으로 간다 | Arrangement Drawing Control(DWG 첨부) 없음<br>코드 Group 체계(FDV 같은 분류 규칙) 없음 | e2e S31 · S32 · S46a~f |
| p36 | 부분 | Key / Detail Dimension · Component · Design Verification | Key Dimension(W·H·L) 표 ✓ · 구획 길이 ✓ · 방향(L0~R270) ✓ — 도면에 `DIR R90` 으로 찍힌다<br>Component 배치 ✓ — 구획을 3×3 칸(앞·중·뒤 × 상·중·하)으로 보고 그 칸에 부품을 놓는다. 그 구획의 BOM 자식만 놓을 수 있다(아니면 409)<br>Design Verification ✓ — 등록한 규칙(전장·폭·높이·구획 수)을 BOM Run 마다 검사하고 위반이면 도면을 못 뜬다(422) | Detail Dimension 없음<br>배치는 칸 단위다 — mm 좌표·기준점/기준면은 회사 실 CAD 규칙이 들어와야 한다<br>구획별 치수는 길이 한 축뿐(폭·높이는 제품 전체 값) | e2e S31c~f · S32d · S38a~f · S40a~f |

## Drawing Management (p37–44)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p37 | 개념·표지 | EDIM Drawing Management — DWG Set-Up | 간지 — 반영: 도면은 뷰 여섯 종 + 용도 구분(⑦) + 브라우저 3D 보기(⑩)까지 같은 BOM 스냅샷에서 나온다 | — | e2e S48 · S51 |
| p38 | 부분 | 치수 전파 — 표를 고치면 도면이 바뀐다 | Key Dimension 표(W·H·L) → DXF. 한 칸 2472→2600 이면 폭만 따라 바뀐다(ezdxf 로 파싱해 확인)<br>한 번의 저장으로 BOM 수량·원가·구매 수량·도면 폭이 함께 바뀌고 앞 스냅샷은 그대로(S30)<br>평면도·조립도 2종 · 번호·개정·상태·발행 잠금<br>치수가 BOM 스냅샷에 박힌다(0011) — 도면은 스냅샷 치수만 읽고, 09-21 의 임시 가드(409)는 걷어냈다(옛 스냅샷은 422)<br>한 칸이 둘 다에 닿는다: 사양 문자열이 cap.face 대신 dim.W/H 를 읽어, W 한 칸을 고치면 BOM 사양·도면·원가가 함께 바뀐다(S30b2 — 09-21 의 중복 해소) | 도면은 아직 선과 글자 수준 — 제작도가 아니다<br>Detail Dimension · 부품도 · KAD-□ 슬롯 문법 없음<br>구획별 치수는 길이 한 축(p36) | e2e S18a~S18f · S19a~S19e · S30a~g · S31 · S40(설계 검증 422) · drawing:test 23 |
| p39 | 부분 | 도면 Templet 호출 설정 6단계 | 1) Product Item 호출 ✓ · 도면 치수 ✓ · 사용 승인 절차(상태 4단계) ✓<br>용도별 구분(⑦) — 등록할 때 승인도·제작도·견적도를 고르고 목록에서 거른다 · 발행 전까지만 용도 변경 | 하부 도면(Sub Drawing) 호출 · 설계 우선순위 없음<br>설계 검증은 규칙 표로 돈다(p36) — Macro 로 쓰는 검증은 아직 | e2e S7 · S18a · S48a~d |
| p40 | 부분 | Call Sub Drawing · Assembling · Detail Design | 조립도 1장에 Item 표 + 풍선번호<br>분해도(Exploded) 가 구획을 띄우고 조립 순서 번호를 붙인다 — 순서는 Arrangement 구획 순서 그대로(0013) | Sub Drawing 호출 · Detail Design · 주의사항 없음 | e2e S18f |
| p41 | 개념·표지 | EDIM Drawing Management — Data Set-Up | — | — | — |
| p42 | 미착수 | 설계 우선순위 · 기준점 · 오류 체크 · Material management | — | 없음 (CAD Mapping · Variant List · Inventory 포함) | — |
| p43 | 미착수 | 전 부서 Work Process — 창고·공정·인원·스킬·시간 | — | 없음 | — |
| p44 | 미착수 | MRP · 작업지시 · 공정 · 자재흐름 · 품질 · 원가 | — | Table List 중 tech·dim 표만 존재. 생산계획·작업지시·공정·품질 없음 | — |

## Selection & Document Set-Up (p45–48)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p45 | 개념·표지 | Selection & Document Set-Up — Arrangement | — | — | — |
| p46 | 부분 | Selection Set-Up — Spec List input | 사양 입력표(⑥) — 회사가 제품 코드마다 사양 항목(풍량 CMH · 가습량 kg/h · 재질 …)을 정의하고, 값을 넣으면 등록된 Sub Code·제품 표에서만 맞는 슬롯 값을 골라 Code Builder 에 채운다. 저장은 기존 개정(Rev) 한 곳<br>Arrangement 형식(구획 구성·순서·길이·방향·부품 배치)이 화면에서 정의된다 — p35·36 과 같은 편집 패널 | Option 정의(Item Image 선택 항목 화면) · Import(엑셀) 없음<br>사양 항목 수정·삭제 없음 | e2e S31 · S32 · S38 · S47a~e |
| p47 | 부분 | Coding + Run + Table | Coding(매크로) + Run + 참조 Table ✓<br>Input Data 템플릿(⑨) — Tech Data 의 입력 항목·단위·범위를 회사가 정한다 | Output Data 템플릿 · 그래프 전용 data · Coding List(노드당 승인 매크로 1개) 없음 | e2e S5 · S10d · S50 |
| p48 | 부분 | 인쇄 | 견적서·Tech Data 인쇄본(흰 A4) ✓ — 브라우저에서 PDF 저장<br>Print Set-up Form(③) — 문서 종류마다 인쇄 양식 하나: 용지 · 여백 · 글꼴 · 머리글/바닥글 · 워터마크. 모양만 바뀌고 숫자는 그대로(스냅샷 body 를 다시 계산하지 않는다) | 양식 안 요소를 끌어 배치하는 편집기 없음 — 정해진 칸의 값만 고친다 | e2e S22c · S43 |

## User Set-Up (p49–52)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p49 | 개념·표지 | User Set-Up | — | — | — |
| p50 | 부분 | 프로젝트 관리(사용자 ERP) | p12 와 같은 화면(②) — 등록 · 헤더 · 담당자 · 영업 단계 전이 · 접수 자료(File)<br>Client = Company DB 고객(⑧) | 영업 활동 이력 · 다중 담당자 없음 | project:test · e2e S42 · S49b |
| p51 | 실동 | 구매 요청 → 견적 요청 → 발주 | PR No · BOM No(스냅샷) · Project No · Process(견적 요청 → 발주) · PO No · BOM List ✓<br>줄은 그 BOM 에서 구매 품목이던 것만, 한 BOM 으로 두 번 못 산다, 발주되면 잠긴다 · Export CSV | Supplier 는 채워진다(p32 등록 공급처가 스냅샷에서 온다) — 남은 것은 Supplier 선택(대안 비교) · Stock list Check · Delivery terms | e2e S24a~S24c · S26a~S26d · document:test 28 |
| p52 | 실동 | 구매 요청 — p51 과 같은 화면 | p51 과 동일 | p51 과 동일 | e2e S26b · S26d |

## Form (p53–62)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p53 | 개념·표지 | Form | — | — | — |
| p54 | 부분 | Set-Up 메뉴 지도 | 1. Code — Sub code · Product Code · Code Relationship ✓<br>EDIM Tool — Macro ✓ · UI Design 일부 | Arrangement Code/Set-up · TLM Design · CPQ Selection · Print Set-up 없음<br>User ERP 는 구매 요청만 | e2e S9 · S10 · S12 |
| p55 | 실동 | Approval Management · Authorization · Security | Design → Check → Approve → Accepted ✓ — 승인은 BOM 스냅샷에 묶인다: 발행·발주는 승인된 BOM 에서만(DB 트리거)<br>역할별 권한(RBAC) · 사용자 관리(마지막 owner 강등 거부) · 테넌트 격리(RLS) · 감사 로그 ✓ | 승인 권한은 회사 안(owner·engineer)뿐 — 플랫폼 단계 승인자 분리는 미정<br>대장은 읽기 전용이다 — 상태 전이는 각 화면에서 한다(의도된 분리) | project:test · rls:test · e2e S27a~d · S29b~d · S11 · S17 |
| p56 | 실동 | 작업대 — 다섯 구역 | Tool bar · Work Hierarchy · Main Work Place · Sub Work Place · Key Work Place 가 청사진 그대로 떠 있다 | EDIM Toolbar 의 업무 목록(고객 관리 … 시운전 요청) 없음 | e2e S1 |
| p57 | 부분 | Toolbox Macro — 다섯 갈래 상호 연동 | Prompt · Macro · Flowchart · Description · Coding 이 같은 매크로를 본다 | Data Management(Directory · Type of source: Table/Chart/Formula drawing) 없음<br>함수 마법사 · 그래프 마법사 없음 | e2e S13b · S13c · S13e |
| p58 | 부분 | Main Work place Toolbar | 명령 버튼이 돈다: Arrangement ▼ · Move · Delete · Add · Copy · DWG View ▼ · 승인(Module)<br>개념도에서 구획을 고르면 Move·Delete·Copy 가 풀리고, 편집은 Design 초안 → 기존 '저장' 한 곳으로만 반영된다(두 번째 편집 길 없음)<br>BOM 관계가 걸린 구획은 툴바로도 못 지운다 · DWG View 는 BOM 스냅샷이 없으면 잠긴다 · 승인은 Inspector Approval 로 데려간다 | 그림 제작 Module(도면 그리기 도구) 없음<br>Free CAD · 설계 심볼은 잠긴 자리 — 누를 수 없고 이유가 적혀 있다(EDIM 안 CAD 편집기·심볼 배치는 아직 없다)<br>Delete 는 선택이 잠긴 구획이어도 눌리고 거부 문구로 막는다(표 쪽 Delete 는 미리 잠김) | e2e S41a~l |
| p59 | 실동 | Hierarchy 와 Run 심볼 | Work Hierarchy 트리에서 노드를 고르면 작업 대상이 호출된다<br>EDIM Run · BOM Run · EBOM Run · Cost · Approval Request ✓ | Hierarchy(Edit) · Data Up-Load · DWG 폴더 없음 | hierarchy:test · e2e S1 · S3 |
| p60 | 실동 | EDIM Run — 같은 입력, 같은 답 | 승인된 식만 실행 · 실행에 LLM 없음 · 결과 455.4 재현<br>매크로는 서버가 실행한다(클라이언트가 값을 보내지 않는다) | Design Tool 범례: Key Dimension ✓ · Component Placement ✓ · Assembly Sequence ✓ · Design Verification ✓ — Detail Dimension · QC/Material Note 는 아직 | e2e S5 · S13e · S20d |
| p61 | 실동 | 코드 조립 — A ▼ B ▼ C ▼ D ▼ E ▼ F ▼ | 슬롯 조립 → 규칙 검증 → VALID → 개정 저장(Rev A→B)<br>등록 안 된 코드는 서버가 422 로 거부<br>개정에 슬롯 F 까지 포함(회장님 결정 2026-09-22) — F 만 다른 미저장 조합은 근거 개정이 빈 값으로 남는다(S22f) | Arrangement Code · Child Component Import/Export(Excel 연동) 없음 | rccs 테스트 · e2e S2 · S2b · S2c · S8b · S22f · S28e |
| p62 | 실동 | BOM Run → EBOM Run → Cost → Document · Drawing · Export | BOM 11행 · 섹션별 EBOM · 원가 · 문서 · 도면 · Export 가 전부 돈다<br>EBOM·Cost 는 다시 계산하지 않고 스냅샷을 읽는다 | 단가는 샘플<br>'Work Process 의 설계·생산·자재 Data 추출' 은 배율 가정(18%·12%) | e2e S6a · S6b · S20a~S20c |

## Structure (p63–67)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p63 | 개념·표지 | Structure | — | — | — |
| p64 | 부분 | TLM Code Management · ERP Set-up | Sub Code · Product Code · Code relationship(BOM) Hierarchy ✓ · Approval management ✓<br>3계층(플랫폼 → 회사 관리자 → 사용자) ✓<br>Company DB — Customer · Supplier(⑧) — /setup/company 두 목록 · 프로젝트 Client 와 단가 공급처가 가리킨다(id + 글자 함께 · 다른 회사 id 는 400) | Department Std. · Warehouse · Inventory · Bank · Employee · Nation 없음<br>고객·공급처 수정·삭제 없음 | platform:test 25 · e2e S16 · S17 · S49a~e |
| p65 | 실동 | Work Process — 한 번의 Run 에서 나오는 것들 | Main Code → BOM → 도면 · 원가 · Tech Data · PCR·견적 · 구매 요청, 모두 한 BOM 스냅샷에서<br>구매 요청에서 거꾸로 추적: BOM → 코드 개정 → 카탈로그 지문 → 매크로 개정 → 승인 | Non-Standard Option(X Code) → R&D → New Code 흐름 없음<br>Project 폴더 저장 구조 없음 | e2e S20a~S20d · S22f · S28a~S28d |
| p66 | 부분 | PCR → Quotation | PCR(Material + Manufacturing = Direct Cost → Full cost) + 견적서 ✓<br>견적 합계 = 스냅샷 원가 그대로(15,487,170 = 15,487,170) | PCR 세부(Procurement · Sub-manufacturing · Sales & Adm. · EBIT) · Business Type 열 없음<br>단가는 샘플 — 구조 시연이다 | e2e S22a~S22f · document:test 28 |
| p67 | 부분 | 단가 관리 Table | 단가가 코드 관계에 한 값으로 있고, 고치면 원가가 바뀐다<br>구매품 단가 이력(⑤-a) — 날짜별로 쌓고 현재·예정·지난을 가른다 · Supplier = Company DB 공급처(⑧) | 견적 적용 · 재고 단가 Table 없음 · 단가 이력이 원가에 자동 반영되지 않는다<br>제조 정보(시간·임율·장비) 없음 | e2e S6b · S45d · S49c |

## Work Process · Biz Model (p68–70)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p68 | 개념·표지 | Work Process | — | — | — |
| p69 | 미착수 | 파트너 · 모바일 ERP · QR | — | 없음 — 파트너 연결 · 사무실 밖 업무(승인·입출고·검수) · QR 정보 | — |
| p70 | 개념·표지 | CTO, ETO Business Model Platform | — | — | — |
