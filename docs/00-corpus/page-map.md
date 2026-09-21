# 청사진 페이지 색인 — 70장의 지금 (main `fd31d88+P6` · 2026-09-21)

> 이 파일은 `docs/02-reports/build_blueprint_match.py` 의 판정 데이터에서 **자동 생성**된다. 손으로 고치지 말 것.
> 실동 18 · 부분 22 · 미착수 11 · 개념·표지 19 (합 70). 판정은 엘의 것 — 회장님 조정 대상.

## System concept (p1–9)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p1 | 개념·표지 | CTO Business Platform — EDIM | CPQ + PLM + ERP + D.T 통합이라는 정체성은 repo README 첫 문장과 발표 덱의 출발점이다 | — | — |
| p2 | 개념·표지 | System concept | — | — | — |
| p3 | 개념·표지 | CTO Business — As-is / To-be | "제품 Configuration 선정과 동시에 모든 업무 자료 생성" — 코드 한 줄에서 BOM·도면·원가·견적·Tech Data·구매 요청이 한 BOM 스냅샷으로부터 나오는 것까지 얇게 실증 | 수작업 입력·오류가 실제로 줄었는지는 회사 실 데이터로 재 본 적이 없다 | — |
| p4 | 개념·표지 | System Integration — 생성 자료 5종 | BOM / Part List ✓ · Tech Data ✓(1종) · DWG 2D ✓(평면·조립) · Cost ✓(단가 샘플) | DWG 3D · Work Process 산출 없음<br>ERP 연계는 구매 요청까지 · Smart Factory·AR/XR 은 EDIM 완료 후 확장 단계(회장님 확정) | — |
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
| p12 | 부분 | 프로젝트 등록·관리 | 프로젝트 PS-61313-5 가 Hierarchy 노드에 묶이고 Inspector 에 Type·Client·Stage(견적)가 뜬다 | /m/project 화면은 목록 한 줄이다 — 영업 단계 전이, Client 담당자 정보, 접수 자료 등록(File), Edit Table 없음 | project:test · e2e S1 |
| p13 | 부분 | Selection Template | Product Code 표시 · BOM / EDIM Run / Quotation·PCR / Drawing 버튼과 목록 ✓<br>Arrangement 개념도(구성 구획) ✓ | Arrangement · Move · Delete · Add Item · DWG View 는 버튼 자리만 있고 동작이 없다<br>Sub Item list · Schedule management 없음 | e2e S21a · S21b |
| p14 | 실동 | 사양표 — 우리 제품의 말로 | BOM 의 사양 열이 p14 문구 그대로 나온다(Base Frame · Casing · Fan · Coil · Damper) | '다단계 Option 추적' 은 슬롯 조건(when) 한 단계 수준 | e2e S6a |
| p15 | 부분 | Technical Data | Tech Data 문서 1종: 결과값 + 그 값을 낸 승인 매크로 개정·원문 + 입력 슬롯, 번호·개정·상태·발행 잠금 | Arrangement 방향(L0~R270) 선택 · Import · Technical data 목록 없음<br>매크로 결과 1값뿐 — 기술 계산서 수준이 아니다 | e2e S23a · S23b · document:test 28 |
| p16 | 부분 | Document Template · Edit Table | Edit Table = Set-Up 의 제품 코드 표 편집 ✓ — 한 칸을 고치면 BOM·매크로·도면이 따라 바뀐다<br>Output Data 인쇄 ✓ | Input Data 템플릿(온도·습도·밀도 + 단위) 없음<br>Table Type 은 tech·dim 두 종뿐(Variant·Material 없음) · Data Up-Load 없음 | e2e S10b · S10d · S18b |
| p17 | 실동 | 네 가지 산출물 — BOM · Quotation · Document · Drawing | 네 가지 모두 화면에서 나오고, 모두 같은 BOM 스냅샷 하나를 입력으로 받는다<br>문서·도면은 번호·개정(A→B)·상태 4단계·발행 잠금 | Approval Drawing / Manufacturing Drawing 구분 없음(평면도·조립도 2종)<br>'준비시간 1시간 이내' 는 재 본 적 없다 | e2e S25b · S19a~S19e · S22d |
| p18 | 부분 | 작업 화면 틀 — Hierarchy · Approval · Schedule | Hierarchy · Description · Approval(BOM 에 묶인 단계 요청) ✓ | Schedule management(To-do · Done · Schedule · Approval Request List) 없음 — Inspector 에 '일정 없음'<br>Data Up-Load 없음 | e2e S1 |

## System tool (p19–28)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p19 | 개념·표지 | Detail Process | — | — | — |
| p20 | 개념·표지 | System tool — 사용자가 직접 필요한 System Customizing | — | — | — |
| p21 | 부분 | UI Tool · Program Tool · 학습 DB | MainForm 옆에 뜨는 플로팅 창 · UI Tool / Program Tool 탭 · 드래그·도킹·상태 유지 ✓<br>Program Tool: Prompt · Macro · Flowchart · Description · Coding 다섯 갈래 | UI Tool 은 Command button 한 가지뿐(→ p25)<br>3. 사내 정보 학습 DB화 없음(P3-b) | e2e S13a · S15a~S15c |
| p22 | 실동 | ① Data Set-up → … → ⑥ Programming → ⑦ 검증·승인 | ① 표 등록 → ③ Item 호출 → ④ 작업 대상 호출 → ⑤ Toolbox 호출 → ⑥ 매크로 작성 → ⑦ 검증·승인이 이어져 돈다<br>Toolbox 의 Run 이 곧 MainForm 의 Run(같은 값) | ② 사용자 제작 UI 는 Command button 수준 | e2e S13a~S13f · S4a~S4c |
| p23 | 미착수 | AI 학습 자료 DB — 도면·문서 학습 | — | DB①(platform 스키마)은 구조만 있고 비어 있다<br>메타데이터 추출(하) · 2D 도면 객체 이해(중) · 3D 형상(상) 어느 단계도 없다 | e2e S16f(DB① 비어 있음을 단언) |
| p24 | 실동 | Projects · Drawings · Revisions | Revisions: 개정 번호(A,B,…)·사유·개정자, append-only(앱 역할에 UPDATE/DELETE 권한 없음)<br>Drawings: 번호·유형·현재 개정·상태(작성중/검토/승인/발행), 발행은 DB 트리거가 잠근다 | Parts · BOM · Material 테이블은 코드 카탈로그 + BOM 스냅샷 구조로 대체(GAP1 결정)<br>scale · size 열 없음 | revision:test · drawing:test 14 · e2e S2b~S2d · S19 |
| p25 | 부분 | 사용자 UI Form — Command button · Combo box · Templet | Command button set-up ✓ — 보이기·순서 변경이 MainForm Action Bar 에 즉시 반영, 기본값 복원 | Combo box set-up · 여러 동작을 정의한 Templet · Canvas Drag 없음(화면에도 그렇게 적혀 있다)<br>UI 개발 AI(설명을 주면 UI 자동 설계) 없음 | e2e S14a · S14b |
| p26 | 미착수 | UI Design 작업장 | — | Set-Up 안의 UI Design 작업장(Work Hierarchy 별 UI · Sample Templet 호출)은 없다<br>p25 의 Command button 한 가지만 Toolbox 창에 있다 | — |
| p27 | 실동 | 매크로 — 제안 → 검토 → 승인 | Verify(정적 검증 + dry-run) → 초안 → 승인 → revision 상승, 승인본만 공식 Run<br>Table 참조 · Flowchart · Description(결정론 역번역) ✓ | Prompt → Macro 는 경로만 있고 실모델 호출 0회(API 키 없음)<br>함수 마법사 · 그래프 마법사 · Address 찾기 없음 | macro 테스트 · e2e S4a~S4c · S13b~S13f |
| p28 | 부분 | 도면 풍선번호 · Item 표 · KAD-□□□ 슬롯 | 조립도에 Item 표와 풍선번호가 들어간다 | 부품 더블클릭 정보 관리 없음<br>KAD-□□□ 슬롯 ↔ Key Dimension 대응 문법 미정<br>조립순서·주의사항 없음 | e2e S18f |

## BOM Code Set-Up (p29–36)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p29 | 개념·표지 | BOM Code Set-Up — 관계형 BOM Code / RCCS™ | — | — | — |
| p30 | 부분 | 여섯 가지 등록 | Sub Code ✓ · Product code ✓ · Product Code Relationship ✓ | Material code & Purchase items 는 제품 코드 종류(kind=purchase) 로만 존재<br>Arrangement code · Arrangement Drawing Control 없음 | e2e S9a · S9b · S10a |
| p31 | 실동 | Sub Code Registration | 그룹·항목·값을 등록하면 MainForm Code Builder 드롭다운에 바로 나타난다 | Approval Status · 3D/2D DWG 첨부 없음 | e2e S9a · S12a · S12b |
| p32 | 미착수 | 자재·구매 품목 코드 등록 | — | 전용 등록 화면이 없다 — 구매 품목은 제품 코드의 kind=purchase 와 관계의 단가로만 존재<br>V·Hz·IP·Insulation·Efficiency·Supplier 속성 · Price Table 없음 | — |
| p33 | 실동 | Product Code + 표 | 제품 코드와 그 표(tech · dim) 등록·편집 ✓<br>표를 고치면 BOM · 매크로 · 도면이 따라 바뀐다 | 3D/2D DWG 첨부 · Data Up-Load 없음 | e2e S10a · S10b · S10d |
| p34 | 실동 | Child Group — 코드 관계가 곧 BOM | Child Group · Q'ty · 조건 · 코드 상속(p34) ✓ · Part List Running Test ✓<br>BOM 은 슬롯 규칙 함수가 아니라 등록된 관계를 돌린 결과다 | 다단 BOM(하위의 하위) 없음 | e2e S8 · S9b~S9d · 회귀 1,200 조합 · backbone:test 13 |
| p35 | 미착수 | Arrangement 코드 등록 | — | 없음 | — |
| p36 | 미착수 | Key / Detail Dimension · Component · Design Verification | — | Key Dimension 만 표로 존재(→ p38). Detail Dimension · Component 배치 · 방향(L0~R270) · Design Verification(Macro) 없음 | — |

## Drawing Management (p37–44)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p37 | 개념·표지 | EDIM Drawing Management — DWG Set-Up | — | — | — |
| p38 | 부분 | 치수 전파 — 표를 고치면 도면이 바뀐다 | Key Dimension 표(W·H·L) → DXF. 한 칸 2472→2600 이면 폭만 따라 바뀐다(ezdxf 로 파싱해 확인)<br>평면도·조립도 2종 · 번호·개정·상태·발행 잠금 | 도면은 아직 선과 글자 수준 — 제작도가 아니다<br>Detail Dimension · 부품도 · KAD-□ 슬롯 문법 없음 | e2e S18a~S18f · S19a~S19e · drawing:test 14 |
| p39 | 부분 | 도면 Templet 호출 설정 6단계 | 1) Product Item 호출 ✓ · 도면 치수 ✓ · 사용 승인 절차(상태 4단계) ✓ | 하부 도면 호출 · 도면 구성 설정 · 설계 우선순위 · 조립 방식/설계 검증 Macro 없음 | e2e S7 · S18a |
| p40 | 부분 | Call Sub Drawing · Assembling · Detail Design | 조립도 1장에 Item 표 + 풍선번호 | Sub Drawing 호출 · Detail Design 없음 | e2e S18f |
| p41 | 개념·표지 | EDIM Drawing Management — Data Set-Up | — | — | — |
| p42 | 미착수 | 설계 우선순위 · 기준점 · 오류 체크 · Material management | — | 없음 (CAD Mapping · Variant List · Inventory 포함) | — |
| p43 | 미착수 | 전 부서 Work Process — 창고·공정·인원·스킬·시간 | — | 없음 | — |
| p44 | 미착수 | MRP · 작업지시 · 공정 · 자재흐름 · 품질 · 원가 | — | Table List 중 tech·dim 표만 존재. 생산계획·작업지시·공정·품질 없음 | — |

## Selection & Document Set-Up (p45–48)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p45 | 개념·표지 | Selection & Document Set-Up — Arrangement | — | — | — |
| p46 | 미착수 | Selection Set-Up — Spec List input | — | Arrangement 형식 정의 · Option 정의 · 사양 입력표 없음 | — |
| p47 | 부분 | Coding + Run + Table | Coding(매크로) + Run + 참조 Table ✓ | Input/Output Data 템플릿 · 그래프 전용 data · Coding List(노드당 승인 매크로 1개) 없음 | e2e S5 · S10d |
| p48 | 부분 | 인쇄 | 견적서·Tech Data 인쇄본(흰 A4) ✓ — 브라우저에서 PDF 저장 | Print Set-up 화면(양식 배치 · 워터마크 · 폰트 · 머리글/바닥글 · 용지) 없음 — 양식은 종류당 하나로 고정 | e2e S22c |

## User Set-Up (p49–52)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p49 | 개념·표지 | User Set-Up | — | — | — |
| p50 | 부분 | 프로젝트 관리(사용자 ERP) | p12 와 같은 화면 — 프로젝트 등록·노드 바인딩·Stage 표시 | 영업 단계 전이 · 담당자 · 접수 자료 없음 | project:test · e2e S1 |
| p51 | 실동 | 구매 요청 → 견적 요청 → 발주 | PR No · BOM No(스냅샷) · Project No · Process(견적 요청 → 발주) · PO No · BOM List ✓<br>줄은 그 BOM 에서 구매 품목이던 것만, 한 BOM 으로 두 번 못 산다, 발주되면 잠긴다 · Export CSV | Supplier 선택 · Stock list Check · Delivery terms 없음(→ p32) | e2e S24a~S24c · S26a~S26d · document:test 28 |
| p52 | 실동 | 구매 요청 — p51 과 같은 화면 | p51 과 동일 | p51 과 동일 | e2e S26b · S26d |

## Form (p53–62)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p53 | 개념·표지 | Form | — | — | — |
| p54 | 부분 | Set-Up 메뉴 지도 | 1. Code — Sub code · Product Code · Code Relationship ✓<br>EDIM Tool — Macro ✓ · UI Design 일부 | Arrangement Code/Set-up · TLM Design · CPQ Selection · Print Set-up 없음<br>User ERP 는 구매 요청만 | e2e S9 · S10 · S12 |
| p55 | 실동 | Approval Management · Authorization · Security | Design → Check → Approve → Accepted ✓ — 승인은 BOM 스냅샷에 묶인다: 발행·발주는 승인된 BOM 에서만(DB 트리거)<br>역할별 권한(RBAC) · 사용자 관리(마지막 owner 강등 거부) · 테넌트 격리(RLS) · 감사 로그 ✓ | DOC No · Version · Released 를 모아 보는 승인 대장 화면 없음<br>승인 권한은 회사 안(owner·engineer)뿐 — 플랫폼 단계 승인자 분리는 미정 | project:test · rls:test · e2e S27a~d · S29b~d · S11 · S17 |
| p56 | 실동 | 작업대 — 다섯 구역 | Tool bar · Work Hierarchy · Main Work Place · Sub Work Place · Key Work Place 가 청사진 그대로 떠 있다 | EDIM Toolbar 의 업무 목록(고객 관리 … 시운전 요청) 없음 | e2e S1 |
| p57 | 부분 | Toolbox Macro — 다섯 갈래 상호 연동 | Prompt · Macro · Flowchart · Description · Coding 이 같은 매크로를 본다 | Data Management(Directory · Type of source: Table/Chart/Formula drawing) 없음<br>함수 마법사 · 그래프 마법사 없음 | e2e S13b · S13c · S13e |
| p58 | 미착수 | Main Work place Toolbar | — | Arrangement · Move · Delete · Add · DWG · View · Free CAD · 설계 심볼 · 승인 — 버튼 줄은 청사진 순서대로 있지만 눌러도 동작하는 것이 없다<br>그림 제작 Module 없음 (Action Bar 편집은 p25 의 것이라 여기서 세지 않았다) | — |
| p59 | 실동 | Hierarchy 와 Run 심볼 | Work Hierarchy 트리에서 노드를 고르면 작업 대상이 호출된다<br>EDIM Run · BOM Run · EBOM Run · Cost · Approval Request ✓ | Hierarchy(Edit) · Data Up-Load · DWG 폴더 없음 | hierarchy:test · e2e S1 · S3 |
| p60 | 실동 | EDIM Run — 같은 입력, 같은 답 | 승인된 식만 실행 · 실행에 LLM 없음 · 결과 455.4 재현<br>매크로는 서버가 실행한다(클라이언트가 값을 보내지 않는다) | Design Tool 범례 중 Key Dimension 만 실제 | e2e S5 · S13e · S20d |
| p61 | 실동 | 코드 조립 — A ▼ B ▼ C ▼ D ▼ E ▼ F ▼ | 슬롯 조립 → 규칙 검증 → VALID → 개정 저장(Rev A→B)<br>등록 안 된 코드는 서버가 422 로 거부 | Arrangement Code · Child Component Import/Export(Excel 연동) 없음 | rccs 테스트 · e2e S2 · S2b · S2c · S8b |
| p62 | 실동 | BOM Run → EBOM Run → Cost → Document · Drawing · Export | BOM 11행 · 섹션별 EBOM · 원가 · 문서 · 도면 · Export 가 전부 돈다<br>EBOM·Cost 는 다시 계산하지 않고 스냅샷을 읽는다 | 단가는 샘플<br>'Work Process 의 설계·생산·자재 Data 추출' 은 배율 가정(18%·12%) | e2e S6a · S6b · S20a~S20c |

## Structure (p63–67)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p63 | 개념·표지 | Structure | — | — | — |
| p64 | 부분 | TLM Code Management · ERP Set-up | Sub Code · Product Code · Code relationship(BOM) Hierarchy ✓ · Approval management ✓<br>3계층(플랫폼 → 회사 관리자 → 사용자) ✓ | Department Std. · Company DB(Customer·Supplier) · Warehouse · Inventory · Bank 없음 | platform:test 25 · e2e S16 · S17 |
| p65 | 실동 | Work Process — 한 번의 Run 에서 나오는 것들 | Main Code → BOM → 도면 · 원가 · Tech Data · PCR·견적 · 구매 요청, 모두 한 BOM 스냅샷에서<br>구매 요청에서 거꾸로 추적: BOM → 코드 개정 → 카탈로그 지문 → 매크로 개정 → 승인 | Non-Standard Option(X Code) → R&D → New Code 흐름 없음<br>Project 폴더 저장 구조 없음 | e2e S20a~S20d · S22f · S28a~S28d |
| p66 | 부분 | PCR → Quotation | PCR(Material + Manufacturing = Direct Cost → Full cost) + 견적서 ✓<br>견적 합계 = 스냅샷 원가 그대로(15,487,170 = 15,487,170) | PCR 세부(Procurement · Sub-manufacturing · Sales & Adm. · EBIT) · Business Type 열 없음<br>단가는 샘플 — 구조 시연이다 | e2e S22a~S22f · document:test 28 |
| p67 | 부분 | 단가 관리 Table | 단가가 코드 관계에 한 값으로 있고, 고치면 원가가 바뀐다 | 견적 · 구매 이력 · 재고 단가 · 견적 적용 Table 4종 없음<br>제조 정보(시간·임율·장비) 없음 · Supplier 없음 | e2e S6b |

## Work Process · Biz Model (p68–70)

| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |
|---|---|---|---|---|---|
| p68 | 개념·표지 | Work Process | — | — | — |
| p69 | 미착수 | 파트너 · 모바일 ERP · QR | — | 없음 — 파트너 연결 · 사무실 밖 업무(승인·입출고·검수) · QR 정보 | — |
| p70 | 개념·표지 | CTO, ETO Business Model Platform | — | — | — |
