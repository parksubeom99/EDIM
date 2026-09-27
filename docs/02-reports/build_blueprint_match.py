#!/usr/bin/env python3
"""EDIM 청사진 70장 대조 보고서 (엘 확정판) — 생성기

왼쪽: 청사진(EDIM.pdf) 원본 쪽  /  오른쪽: 지금 실제로 도는 화면(demo_e2e 산출 스크린샷)
판정 데이터 PAGES 하나에서 세 가지가 나온다: 다크 HTML(화면용) · 흰 HTML(→ A4 가로 PDF) · docs/00-corpus/page-map.md

usage: python3 build_blueprint_match.py <corpus_dir> <shots_dir> <out_dir> [main_sha]
  corpus_dir : EDIM.pdf 를 푼 폴더 (1.jpeg … 70.jpeg)
  shots_dir  : scripts/demo_e2e.py 가 남긴 스크린샷 폴더
판정 기준(이 파일이 SSOT):
  L 실동   — 그 장의 핵심 동작이 화면에서 끝까지 돌고, e2e 또는 DB 검증이 그것을 못 박고 있다
  P 부분   — 그 장의 일부만 돈다(무엇이 돌고 무엇이 없는지 둘 다 적는다)
  N 미착수 — 구현 대상인데 도는 것이 없다(자리만 있는 것은 미착수다)
  C 개념·표지 — 구현 대상이 아닌 장(표지·간지·개념 설명). 반영된 곳이 있으면 적는다
"""
import base64, html, io, os, sys
from PIL import Image

CORPUS, SHOTS, OUTDIR = sys.argv[1], sys.argv[2], sys.argv[3]
MAIN = sys.argv[4] if len(sys.argv) > 4 else "p6"
DATE = "2026-09-27"
HERE = os.path.dirname(os.path.abspath(__file__))
DECK = os.path.join(HERE, "..", "deck")

SECTIONS = [
    ("System concept", 1, 9), ("Product Selection", 10, 18), ("System tool", 19, 28),
    ("BOM Code Set-Up", 29, 36), ("Drawing Management", 37, 44), ("Selection & Document Set-Up", 45, 48),
    ("User Set-Up", 49, 52), ("Form", 53, 62), ("Structure", 63, 67), ("Work Process · Biz Model", 68, 70),
]
ST = {"L": "실동", "P": "부분", "N": "미착수", "C": "개념·표지"}

def pg(st, tag, title, have=(), gap=(), ev="", shot=None, nx=""):
    return dict(st=st, tag=tag, title=title, have=list(have), gap=list(gap), ev=ev, shot=shot, nx=nx)

# ── 판정 데이터 (청사진 70쪽 전수 정독 2026-09-21 · 2026-09-23 재실측 갱신 · 2026-09-27 ②~⑩ 반영 — CC 초안을 엘이 재측정·확정(main 2d5db0f · e2e 234/234 ×2, KST 새벽 조건 포함) · repo main 실측 · 화면은 스크린샷을 눈으로 확인) ──
PAGES = {
 1: pg("C", "표지", "CTO Business Platform — EDIM", ["CPQ + PLM + ERP + D.T 통합이라는 정체성은 repo README 첫 문장과 발표 덱의 출발점이다"]),
 2: pg("C", "간지", "System concept"),
 3: pg("C", "개념", "CTO Business — As-is / To-be",
       ["\"제품 Configuration 선정과 동시에 모든 업무 자료 생성\" — 코드 한 줄에서 BOM·도면·원가·견적·Tech Data·구매 요청이 **한 BOM 스냅샷**으로부터 나오는 것까지 얇게 실증"],
       ["수작업 입력·오류가 실제로 줄었는지는 회사 실 데이터로 재 본 적이 없다"], shot="44_document_tab"),
 4: pg("C", "개념", "System Integration — 생성 자료 5종",
       ["BOM / Part List ✓ · Tech Data ✓(Input Data 템플릿 값 포함) · DWG 2D ✓(뷰 여섯 종 · 용도별 승인도·제작도·견적도) · Cost ✓(단가 이력)",
        "**DWG 3D** — 브라우저 3D 뷰어가 같은 BOM 스냅샷의 구획 박스(길이 × 단면)를 돌려 본다(⑩ · 새 데이터 없음)"],
       ["실제 형상 모델(glTF) 없음 — 3D 는 구획 박스와 부품 칸 표시까지", "Work Process 산출 없음", "ERP 연계는 구매 요청까지 · Smart Factory·AR/XR 은 EDIM 완료 후 확장 단계(회장님 확정)"],
       "e2e S51a~d · S39", "64_viewer3d"),
 5: pg("L", "EDIM / Code", "Real-Time Code connectivity — 코드 한 줄이 회사를 관통한다",
       ["제품 선정(Code 생성) → Part-List(Code 연결) → DWG(Code 기반) → Cost → 견적 → 구매 요청이 끊기지 않고 이어진다", "연결 장부 14고리 중 **이어짐 12 · 약함 0 · 없음 2**"],
       ["Product(Code QR) · Manufacturing/MES 고리 없음", "남은 '없음' 2: DB①→DB②(P3-b · DXF 연구 후) · Special(P3-c · D1 후)"],
       "docs/plan/connection-ledger.md · e2e S8 · S18c · S22b · S24a · S28a", "15_bom_cost", "남은 두 고리는 회장님·사장님 입력을 기다린다"),
 6: pg("C", "개념", "EDIM System 구성",
       ["MainForm 상단에 CPQ · PLM · ERP · EDIM Toolbox, 별도 Set-Up(Code System) 화면이 실제로 있다"],
       ["GUI Toolkit Canvas · EDIM Chart · Template 없음", "Product DB 의 [AI 학습] 갈래는 구조만(DB① 비어 있음)"], shot="10_project_bound"),
 7: pg("C", "개념", "EDIM 효과", ["1. 제품 선정과 동시에 생성되는 자료 4종(BOM·도면·기술 자료·견적서)은 모두 화면에서 나온다(깊이는 p17 참조)"],
       ["2. 경영 효과 · 3. Set-up 시간 20% 는 주장이다 — 재 본 값이 없다"]),
 8: pg("C", "개념", "기존 System 대비 — 시스템 정의 50 / 고객 구현 40 / EDIM 지원 10",
       ["3계층으로 반영: 회사가 자기 코드·표·매크로를 직접 고치고(셀프서비스), 플랫폼으로 올라오는 것은 Special 의뢰 한 통로뿐"],
       ["50/40/10 비율은 실제 Set-up 을 해 본 적이 없어 검증되지 않았다"], "e2e S10b · S16a~S16j", "40_company_admin"),
 9: pg("P", "System Operation", "Web-based Application · Cloud-based Data Management",
       ["웹 애플리케이션(Next.js) ✓", "고객사 격리를 Postgres RLS 로 강제 · 플랫폼 계정은 고객사 업무 데이터를 DB 권한상 못 읽는다"],
       ["클라우드 배포 0회 — 지금은 로컬 docker + 엘 샌드박스뿐", "Self-managed Servers 선택지 없음"],
       "rls:test · platform:test 25 · e2e S16g", "41_platform_console", "배포는 80% 완성·발표 이후 결정 사안"),
 10: pg("C", "간지 + 흐름", "Project Registration ▶ Product Selection ▶ Document ▷ ERP",
        ["이 네 단계가 얇게 한 줄로 이어져 돈다: 프로젝트 노드 → 코드 조립 → BOM·도면·견적·Tech Data → 구매 요청"], [], "e2e S1 → S2 → S6 → S25 → S26", "44_document_tab"),
 11: pg("P", "Log in", "로그인",
        ["이메일 로그인 → 세션 → 테넌트 결정 → 역할(RBAC) 가드 ✓", "권한 없는 역할의 등록 시도는 403"],
        ["**비밀번호가 없다** — 베타용 최소 인증(화면에 'sign in (dev)'라고 적혀 있다)", "NOVA Solution 브랜딩 · SSO 없음"],
        "auth 테스트 PASS · e2e S0 · S11", "00_login", "실 인증은 배포 결정과 함께"),
 12: pg("L", "ERP / Sale / Project Management", "프로젝트 등록·관리",
        ["/m/project — 등록(Registration Process) · 헤더(Type·Client·담당자·Remarks·Description) 수정 · **영업 단계 전이** · 접수 자료(File) 등록·내려받기(②)",
         "Client 를 **Company DB 고객 목록**에서 고르면 id 와 이름이 함께 남는다(⑧ · 옛 글자 데이터 보존)",
         "**Client 담당자 여러 명**(이름·부서·연락처 · 주담당 1명) · **영업 활동 이력**(날짜·종류·내용 — 쌓기만, 앱 역할은 고치지도 지우지도 못한다)(F1)",
         "고객 **수정 · 사용 중지 · 삭제** — 프로젝트·단가·구매 요청이 가리키면 삭제 409 + 건수, 대신 사용 중지(F2)",
         "Schedule management 는 작업대 Inspector 에서 돈다(p18)"],
        [],
        "project:test · e2e S42 · S49b · S53a~e · S54a~e", "66_project_contacts"),
 13: pg("L", "C-1 · ERP / CPQ / Selection Template", "Selection Template",
        ["Product Code 표시 · BOM / EDIM Run / Quotation·PCR / Drawing 버튼과 목록 ✓", "Arrangement 개념도 = 등록된 구획(하드코딩 아님) — 활성 구획이 폭 비례로 그려진다",
         "**Arrangement 편집이 돈다**: 구획 길이 · 순서(Move) · 추가(Add) · 삭제(Delete) · 방향(L0~R270) · 부품 배치를 고쳐 저장하면 다음 BOM 의 도면이 그대로 따라온다",
         "**Sub Item list**(F6) — 스냅샷 BOM 줄(Item · Description · Q'ty · Remarks), 개념도에서 구획을 고르면 그 구획 줄만",
         "**DWG View**(F6) — 툴바 'DWG View ▼' 가 스냅샷에서 뜬 그 DXF 를 서버에서 SVG 로 옮겨 **화면에 띄운다**(평면·정면·우측면·조립·등각·분해 · 새 도면 계산 없음)",
         "Schedule management(To-do·Done·기한·승인 요청 목록)가 Inspector 에 들어왔다"],
        [],
        "e2e S21a · S21b · S31a~h · S32a~h · S36a~c · S38a~f · S58a~e", "70_dwg_view", "Detail Dimension 은 회사 상세 치수 규칙이 들어올 때"),
 14: pg("L", "공기조화기 사양", "사양표 — 우리 제품의 말로",
        ["BOM 의 사양 열이 p14 문구 그대로 나온다(Base Frame · Casing · Fan · Coil · Damper)"],
        ["'다단계 Option 추적' 은 슬롯 조건(when) 한 단계 수준"], "e2e S6a", "15_bom_cost"),
 15: pg("L", "C-2 · ERP / CPQ / Tech.", "Technical Data",
        ["Tech Data 문서: 결과값 + **그 값을 낸 승인 매크로 개정·원문** + 입력 슬롯, 번호·개정·상태·발행 잠금",
         "**Technical data 목록**(/techdata · F7) — 스냅샷별 Tech Data 문서를 모아 상태·번호/코드로 거른다, 입력 항목이 열로(다시 계산하지 않음)",
         "**Import**(F7) — Input Data 값을 CSV(key,value)로 채운다 · 템플릿 밖 key · 수 아닌 값 · 중복은 줄 번호와 함께 거부"],
        ["매크로 결과 1값뿐 — 기술 계산서 수준이 아니다(필요한 입력: 회사 계산서 양식·성능 데이터)"],
        "e2e S23a · S23b · S59a~d · document:test", "71_techdata_list", "회사 실 기술 계산식이 들어와야 깊어진다(회장님·사장님 자료)"),
 16: pg("L", "C-2 · Document Template", "Document Template · Edit Table",
        ["Edit Table = Set-Up 의 제품 코드 표 편집 ✓ — 한 칸을 고치면 BOM·매크로·도면이 따라 바뀐다", "Output Data 인쇄 ✓",
         "**Input Data 템플릿**(⑨) — 항목의 단위·기본값·범위를 회사가 정하고, Tech Data 에 **스냅샷**으로 남긴다(범위 밖 400)",
         "**Output Data 템플릿**(H6) — 출처는 승인 매크로 결과 · 스냅샷 값(원가·치수)뿐 · 새 계산식은 받지 않는다 · **그래프**(그래프 전용 data + 표시선) · **Table List**(Department · Table Type Variant·Tech·Material)",
         "**Data Up-Load**(F8) — 작업대 노드에 자료를 올리고 Inspector 에 목록 · 내려받기"],
        ["밀도(kg/m³) 같은 Output 계산 — 필요한 입력: 그 값을 내는 회사 계산식(승인 매크로) · 팬 곡선 — 필요한 입력: 제조사 성능표"],
        "e2e S10b · S10d · S18b · S50a~d · S60a~c · S65a~e", "75_output_template"),
 17: pg("L", "CPQ / Document", "네 가지 산출물 — BOM · Quotation · Document · Drawing",
        ["네 가지 모두 화면에서 나오고, **모두 같은 BOM 스냅샷 하나**를 입력으로 받는다", "문서·도면은 번호·개정(A→B)·상태 4단계·발행 잠금",
         "도면 **용도별 구분**(⑦) — 승인도(-APV)·제작도(-MFG)·견적도(-QTN) 로 번호·개정이 따로 가고, 발행 뒤에는 용도도 못 바꾼다"],
        ["'준비시간 1시간 이내' 는 재 본 적 없다", "용도별로 도면 내용(치수 깊이 · 표제란)이 달라지지는 않는다 — 지금은 분류와 번호다"],
        "e2e S25b · S19a~S19e · S22d · S48a~d", "61_drawing_purpose"),
 18: pg("L", "PLM > Set-Up > Work Process > Design", "작업 화면 틀 — Hierarchy · Approval · Schedule · Data Up-Load",
        ["Hierarchy · Description · Approval(BOM 에 묶인 단계 요청) ✓", "**Schedule management ✓** — To-do list · Done items · 기한(지나면 '지남') · Approval Request List 가 작업대 안에서 돈다",
         "**Data Up-Load**(F8) — 지금 고른 노드(프로젝트든 Item 이든)에 자료·DWG 2D·3D 를 올리고 Inspector 에 목록 · 내려받기(0014 저장소 재사용 · 허용 밖 확장자 415)"], [],
        "e2e S1 · S60a~c", "10_project_bound"),
 19: pg("C", "간지", "Detail Process"),  # 글자가 이미지로 들어 있어 텍스트 추출본은 비어 있다 — 쪽 이미지를 보고 확인(2026-09-21)
 20: pg("C", "간지", "System tool — 사용자가 직접 필요한 System Customizing"),
 21: pg("P", "EDIM Toolbox", "UI Tool · Program Tool · 학습 DB",
        ["MainForm 옆에 뜨는 플로팅 창 · UI Tool / Program Tool 탭 · 드래그·도킹·상태 유지 ✓", "Program Tool: Prompt · Macro · Flowchart · Description · Coding 다섯 갈래"],
        ["UI Tool 은 Command button 한 가지뿐(→ p25)", "3. 사내 정보 학습 DB화 없음(P3-b)"],
        "e2e S13a · S15a~S15c", "31_toolbox_ui_tool", "P3-b 는 회장님 DXF 추출 연구 결과 후"),
 22: pg("L", "EDIM Tool programming Process", "① Data Set-up → … → ⑥ Programming → ⑦ 검증·승인",
        ["① 표 등록 → ③ Item 호출 → ④ 작업 대상 호출 → ⑤ Toolbox 호출 → ⑥ 매크로 작성 → ⑦ 검증·승인이 이어져 돈다", "Toolbox 의 Run 이 곧 MainForm 의 Run(같은 값)"],
        ["② 사용자 제작 UI 는 Command button 수준"], "e2e S13a~S13f · S4a~S4c", "30_toolbox_program"),
 23: pg("N", "EDIM AI Tool", "AI 학습 자료 DB — 도면·문서 학습",
        [], ["DB①(platform 스키마)은 **구조만 있고 비어 있다**", "메타데이터 추출(하) · 2D 도면 객체 이해(중) · 3D 형상(상) 어느 단계도 없다"],
        "e2e S16f(DB① 비어 있음을 단언)", None, "P3-b — 회장님 DXF 추출 연구 결과가 입력. D4 하이브리드로 결정됨"),
 24: pg("L", "EDIM AI Tool · 도면 DB", "Projects · Drawings · Revisions",
        ["Revisions: 개정 번호(A,B,…)·사유·개정자, **append-only**(앱 역할에 UPDATE/DELETE 권한 없음)", "개정 = **슬롯 A~F 전체 코드**(2026-09-22 회장님 결정) — F 가 붙은 실행도 자기 근거 개정으로 추적된다", "Drawings: 번호·유형·현재 개정·상태(작성중/검토/승인/발행), 발행은 DB 트리거가 잠근다"],
        ["Parts · BOM · Material 테이블은 코드 카탈로그 + BOM 스냅샷 구조로 대체(GAP1 결정)", "scale · size 열 없음"],
        "revision:test · drawing:test 18 · e2e S2b~S2d · S19 · S28e", "11b_revisions"),
 25: pg("P", "S-2 · EDIM Toolbox UI", "사용자 UI Form — Command button · Combo box · Templet",
        ["Command button set-up ✓ — 보이기·순서 변경이 MainForm Action Bar 에 **즉시 반영**, 기본값 복원",
         "**UI Form**(④) — Combo box(=Sub Code) · Table(=제품 표) · Button(찾기·초기화·복사) 을 끌어다 놓고 Set-up, Templet 호출 = 복사해 고치기, Run 은 실제 카탈로그 데이터"],
        ["UI 개발 AI(설명을 주면 UI 자동 설계) 없음", "Form 을 MainForm 작업 흐름에 끼워 넣는 연결은 Toolbox 링크까지"],
        "e2e S14a · S14b · S44a~f", "57_ui_design"),
 26: pg("P", "S-2-1 · Set-Up / EDIM UI Design", "UI Design 작업장",
        ["**/setup/ui 작업장**(④) — 팔레트에서 24×16 캔버스로 끌어다 놓기(겹침 없는 자리 자동) · 위젯별 Set-up · Sample Templet 호출(복사) · 저장·Run"],
        ["Work Hierarchy 노드별로 다른 UI 를 붙이는 연결 없음", "UI 개발 AI 없음"],
        "e2e S44a~f", "57_ui_design"),
 27: pg("L", "S-2-2 · EDIM Toolbox Macro", "매크로 — 제안 → 검토 → 승인",
        ["Verify(정적 검증 + dry-run) → 초안 → 승인 → revision 상승, 승인본만 공식 Run", "Table 참조 · Flowchart · Description(결정론 역번역) ✓"],
        ["Prompt → Macro 는 경로만 있고 **실모델 호출 0회**(API 키 없음)", "함수 마법사 · 그래프 마법사 · Address 찾기 없음"],
        "macro:test 10(첫 승인 r1 · 반려는 번호 소비 안 함 — 09-21 수리) · e2e S4a~S4c · S13b~S13f", "13_macro_approved", "회장님 몫: API 키로 Prompt 1회 확인"),
 28: pg("P", "Macro 예제", "도면 풍선번호 · Item 표 · KAD-□□□ 슬롯",
        ["조립도에 Item 표와 풍선번호가 들어간다"], ["부품 더블클릭 정보 관리 없음", "KAD-□□□ 슬롯 ↔ Key Dimension 대응 **문법 미정**", "조립순서·주의사항 없음"],
        "e2e S18f", "49_dxf_assembly", "슬롯 문법은 RCCS 사안 — 회장님 결정"),
 29: pg("C", "간지", "BOM Code Set-Up — 관계형 BOM Code / RCCS™"),
 30: pg("L", "Code Set-Up 개요", "여섯 가지 등록",
        ["Sub Code ✓ · Product code ✓ · Product Code Relationship ✓",
         "Material code & Purchase items — /setup/material 전용 화면 · 코드별 **Approval Status**(작성중→승인→사용중지, 역행 금지) · **DWG 2D/3D 첨부**(F4)",
         "Arrangement code(⑤-b) · **Arrangement Drawing Control** — 승인된 Arrangement Code 에만 DWG 첨부(F5)"],
        ["코드 Group 체계(FDV 같은 분류 규칙) — 필요한 입력: 회사 분류 규칙"], "e2e S9a · S9b · S10a · S56a~e · S57a~d", "69_code_approval"),
 31: pg("L", "S-1-1 · Set-up / PLM / Sub Code", "Sub Code Registration",
        ["그룹·항목·값을 등록하면 MainForm Code Builder 드롭다운에 바로 나타난다"], ["Approval Status · 3D/2D DWG 첨부 없음"],
        "e2e S9a · S12a · S12b", "20_setup_subcode"),
 32: pg("L", "S-1-2 · Material code & General purchase items", "자재·구매 품목 코드 등록",
        ["**/setup/material 전용 화면**(⑤-a) — 구매품 코드 분류 트리 · Registered Code Table(A:Supplier · V · Hz · IP · Insulation · Efficiency) 이 기존 제품 코드 API 로 한 표를 고친다 · 새 자재 코드",
         "**G:Price 단가 이력**(p67) — 고치지 않고 쌓는다 · 현재 = 오늘까지 유효한 최신 · 미래 = 예정 · 공급처를 Company DB 목록에서 고른다(⑧) · BOM Run 순간의 현재 단가가 원가에 들어간다(E)",
         "코드별 **Approval Status**(작성중→승인→사용중지 · 역행은 DB 트리거가 막는다) · **DWG 2D/3D 첨부**(올리기·내려받기 · 사용중지 코드엔 새 단가·도면 409)(F4)",
         "등록한 공급처가 BOM Run 때 스냅샷 줄에 박히고 구매 요청이 그대로 받는다(S34)"],
        [],
        "e2e S34a~d · S45a~e · S49c · S52a~g · S56a~e", "69_code_approval"),
 33: pg("L", "S-1-3 · Set-up / PLM / Product Code", "Product Code + 표",
        ["제품 코드와 그 표(tech · dim) 등록·편집 ✓", "표를 고치면 BOM · 매크로 · 도면이 따라 바뀐다"], ["3D/2D DWG 첨부 · Data Up-Load 없음"],
        "e2e S10a · S10b · S10d", "21_setup_product_table"),
 34: pg("L", "S-1-4 · Product Code Relationship", "Child Group — 코드 관계가 곧 BOM",
        ["Child Group · Q'ty · 조건 · 코드 상속(p34) ✓ · Part List Running Test ✓", "BOM 은 슬롯 규칙 함수가 아니라 **등록된 관계를 돌린 결과**다"],
        ["다단 BOM(하위의 하위) 없음"], "e2e S8 · S9b~S9d · 회귀 1,200 조합 · backbone:test 13", "22_setup_relationship"),
 35: pg("L", "S-1-5 · Arrangement Code", "Arrangement 코드 등록",
        ["**/setup/arrangement-code**(⑤-b) — 제품의 지금 배치(구획 순서·길이·방향·부품 위치)를 이름 붙여 스냅샷 등록 → owner 승인/반려(한 번뿐) → **승인된 것만** 제품에 적용(기존 Arrangement 저장 규칙 그대로)",
         "구획 길이·순서·방향·부품 칸은 Design 탭 편집 패널과 툴바(p58)에서도 같은 저장 한 곳으로 간다",
         "**Arrangement Drawing Control**(F5) — 승인된 코드에만 DWG 첨부(승인 전 409 · 허용 밖 확장자 415)"],
        ["코드 Group 체계(FDV 같은 분류 규칙) — 필요한 입력: 회사 분류 규칙"],
        "e2e S31 · S32 · S46a~f · S57a~d", "59_arrangement_code"),
 36: pg("P", "S-1-6 · Arrangement Set-Up", "Key / Detail Dimension · Component · Design Verification",
        ["Key Dimension(W·H·L) 표 ✓ · 구획 길이 ✓ · **방향(L0~R270)** ✓ — 도면에 `DIR R90` 으로 찍힌다",
         "**Component 배치** ✓ — 구획을 3×3 칸(앞·중·뒤 × 상·중·하)으로 보고 그 칸에 부품을 놓는다. 그 구획의 BOM 자식만 놓을 수 있다(아니면 409)",
         "**Design Verification** ✓ — 등록한 규칙(전장·폭·높이·구획 수)을 BOM Run 마다 검사하고 **위반이면 도면을 못 뜬다(422)**"],
        ["Detail Dimension 없음", "배치는 칸 단위다 — mm 좌표·기준점/기준면은 회사 실 CAD 규칙이 들어와야 한다", "구획별 치수는 길이 한 축뿐(폭·높이는 제품 전체 값)"],
        "e2e S31c~f · S32d · S38a~f · S40a~f", "16_design_tab", "남은 것: Detail Dimension · 기준점/기준면"),
 37: pg("C", "간지", "EDIM Drawing Management — DWG Set-Up",
        ["간지 — 반영: 도면은 뷰 여섯 종 + 용도 구분(⑦) + 브라우저 3D 보기(⑩)까지 같은 BOM 스냅샷에서 나온다"], [], "e2e S48 · S51", "64_viewer3d"),
 38: pg("P", "PLM / Design Drawing / Set-Up / Macro", "치수 전파 — 표를 고치면 도면이 바뀐다",
        ["Key Dimension 표(W·H·L) → DXF. 한 칸 2472→2600 이면 **폭만** 따라 바뀐다(ezdxf 로 파싱해 확인)", "한 번의 저장으로 BOM 수량·원가·구매 수량·도면 폭이 **함께** 바뀌고 앞 스냅샷은 그대로(S30)", "평면도·조립도 2종 · 번호·개정·상태·발행 잠금", "**치수가 BOM 스냅샷에 박힌다(0011)** — 도면은 스냅샷 치수만 읽고, 09-21 의 임시 가드(409)는 걷어냈다(옛 스냅샷은 422)", "**한 칸이 둘 다에 닿는다**: 사양 문자열이 cap.face 대신 dim.W/H 를 읽어, W 한 칸을 고치면 BOM 사양·도면·원가가 함께 바뀐다(S30b2 — 09-21 의 중복 해소)"],
        ["도면은 아직 **선과 글자** 수준 — 제작도가 아니다", "Detail Dimension · 부품도 · KAD-□ 슬롯 문법 없음", "구획별 치수는 길이 한 축(p36)"],
        "e2e S18a~S18f · S19a~S19e · S30a~g · S31 · S40(설계 검증 422) · drawing:test 23", "43_drawings", "DXF 연구 결과와 CAD 담당의 Drawing Set-Up 입력이 필요"),
 39: pg("P", "Set-Up / PLM / Work Process / Design", "도면 Templet 호출 설정 6단계",
        ["1) Product Item 호출 ✓ · 도면 치수 ✓ · 사용 승인 절차(상태 4단계) ✓", "**용도별 구분**(⑦) — 승인도·제작도·견적도 · 발행 전까지만 용도 변경",
         "**도면 템플릿**(H5) — 제품마다 **하부 도면(Sub Drawing) 호출** · **설계 우선순위**(작을수록 먼저, 같으면 코드 순) · 도면을 뜨는 순간 스냅샷에 있는 하위 코드만 도면에 박힌다"],
        ["설계 검증은 규칙 표로 돈다(p36) — **Macro 로 쓰는 검증**은 아직(소프트웨어 몫)"],
        "e2e S7 · S18a · S48a~d · S64a~e", "74_sub_drawing"),
 40: pg("L", "Work Process / Design", "Call Sub Drawing · Assembling · Detail Design",
        ["조립도 1장에 Item 표 + 풍선번호", "**분해도(Exploded)** — 조립 순서 번호(Arrangement 구획 순서 그대로 · 0013)",
         "**Call Sub Drawing**(H5) — 도면 시트에 하부 도면 표(Item · Description · Q'ty · Remarks · 코드에 첨부한 DWG) · **Detail Design 주의사항** 목록 · 템플릿을 고쳐도 뜬 도면은 그대로"],
        ["하부 도면을 조립도 안에 mm 로 배치(Detail Dimension A~K) — 필요한 입력: 회사 CAD 규칙(M4)"], "e2e S18f · S64a~e", "74_sub_drawing"),
 41: pg("C", "간지", "EDIM Drawing Management — Data Set-Up"),
 42: pg("N", "Data Set-Up", "설계 우선순위 · 기준점 · 오류 체크 · Material management", [], ["없음 (CAD Mapping · Variant List · Inventory 포함)"], "", None, "CAD 담당 영역(역할 분담 확정)"),
 43: pg("N", "S-4-1-2 · Work Process Management", "전 부서 Work Process — 창고·공정·인원·스킬·시간", [], ["없음"], "", None, "ERP 확장 — 80% 범위 밖"),
 44: pg("N", "Table List · Manufacturing", "MRP · 작업지시 · 공정 · 자재흐름 · 품질 · 원가", [], ["Table List 중 tech·dim 표만 존재. 생산계획·작업지시·공정·품질 없음"], "", None, "ERP/MES 확장 — 80% 범위 밖"),
 45: pg("C", "간지", "Selection & Document Set-Up — Arrangement"),
 46: pg("L", "S-3-1 · Set-up / CPQ / Selection", "Selection Set-Up — Spec List input",
        ["**사양 입력표**(⑥) — 회사가 제품 코드마다 사양 항목(풍량 CMH · 가습량 kg/h · 재질 …)을 정의하고, 값을 넣으면 **등록된 Sub Code·제품 표에서만** 맞는 슬롯 값을 골라 Code Builder 에 채운다. 저장은 기존 개정(Rev) 한 곳",
         "사양 항목 **수정·삭제**(F3) — 수정도 카탈로그와 다시 대조 · key 는 못 바꾼다",
         "**Import**(F3) — CSV 미리보기(줄마다 판정·이유·파일 줄 번호) → 모든 줄이 맞을 때만 확정(엑셀은 CSV UTF-8 로 저장해 올린다)",
         "Arrangement 형식(구획 구성·순서·길이·방향·부품 배치)이 화면에서 정의된다 — p35·36 과 같은 편집 패널"],
        ["Option 정의(Item Image 선택 항목 화면) — 필요한 입력: 회사 선택 항목 이미지"],
        "e2e S31 · S32 · S38 · S47a~e · S55a~e", "68_spec_import"),
 47: pg("L", "S-3-2,3 · Tech. Data & Document Set-Up", "Coding + Run + Table",
        ["Coding(매크로) + Run + 참조 Table ✓", "Input Data 템플릿(⑨)",
         "**Output Data 템플릿 · 그래프 전용 data · 그래프 · Table List**(H6) — Tech Data 를 만들 때 값·그래프가 문서에 박힌다",
         "**Coding List**(H7) — 노드마다 승인 매크로 1개 · 마지막 BOM 이 쓴 개정 · Inspector 에서 이동"],
        ["Output 계산식(밀도 등) — 필요한 입력: 회사 계산식"], "e2e S5 · S10d · S50 · S65a~e · S66a~d", "76_coding_list"),
 48: pg("P", "S-3-4 · Print Set-up", "인쇄",
        ["견적서·Tech Data **인쇄본(흰 A4)** ✓ — 브라우저에서 PDF 저장",
         "**Print Set-up Form**(③) — 용지 · 여백 · 글꼴 · 머리글/바닥글 · 워터마크(숫자는 그대로)",
         "**인쇄 양식 편집기**(H9) — 제목 · 필드 · 표 · 도면 · 그래프 · 서명칸 · 로고 · 글상자를 끌어 배치·크기 조절 → 새 버전 · 인쇄본이 배치를 따르고 **발행본은 발행 순간 버전에 고정**"],
        ["File 내보내기(Office .docx · .xlsx) 없음 — 인쇄본은 브라우저 PDF 저장뿐(소프트웨어 몫)"],
        "e2e S22c · S43 · S68a~e", "78_print_layout"),
 49: pg("C", "간지", "User Set-Up"),
 50: pg("L", "Set-Up / User ERP / Sale / Project Management", "프로젝트 관리(사용자 ERP)",
        ["p12 와 같은 화면(②) — 등록 · 헤더 · 담당자 · 영업 단계 전이 · 접수 자료(File)", "Client = Company DB 고객(⑧)",
         "**Client 담당자 여러 명**(주담당 1명) · **영업 활동 이력**(쌓기만)(F1)"],
        [], "project:test · e2e S42 · S49b · S53a~e", "66_project_contacts"),
 51: pg("L", "S-3-5 · User ERP / Material / Purchase", "구매 요청 → 견적 요청 → 발주",
        ["PR No · BOM No(스냅샷) · Project No · Process(견적 요청 → 발주) · PO No · BOM List ✓", "줄은 그 BOM 에서 **구매 품목이던 것만**, 한 BOM 으로 두 번 못 산다, 발주되면 잠긴다 · Export CSV"],
        ["**Supplier 는 채워진다**(p32 등록 공급처가 스냅샷에서 온다) — 남은 것은 Supplier **선택**(대안 비교) · Stock list Check · Delivery terms"], "e2e S24a~S24c · S26a~S26d · document:test 28", "45_purchasing", "Supplier 는 p32 자재 코드 등록이 먼저"),
 52: pg("L", "S-3-5 (중복 장)", "구매 요청 — p51 과 같은 화면", ["p51 과 동일"], ["p51 과 동일"], "e2e S26b · S26d", "45_purchasing"),
 53: pg("C", "간지", "Form"),
 54: pg("L", "System Set-Up", "Set-Up 메뉴 지도",
        ["**/setup/map**(F9) — 청사진 p54 트리(EDIM System Structure · Tool UI Design · CPQ · TLM · ERP)를 그대로 옮겼다",
         "있는 화면은 링크 — Code(Sub · Material · Product · Relationship · Arrangement Code · Arrangement Set-up) · Macro · UI Design · CPQ Selection · Technical · Document · Print Set-up · Company DB · User ERP(프로젝트)",
         "없는 것은 있는 척하지 않는다 — Work Process · Department · 그 밖의 ERP 는 '아직 없음 — 필요한 입력'"],
        ["Work Process(부서별 절차) · Department(부서 체계) — 필요한 입력: 회사 정의 · 그 밖의 ERP 는 확장 단계"],
        "e2e S9 · S10 · S12 · S61a~d", "23_codebuilder_from_subcode"),
 55: pg("L", "System Set-Up", "Approval Management · Authorization · Security",
        ["Design → Check → Approve → Accepted ✓ — 승인은 **BOM 스냅샷에 묶인다**: 발행·발주는 승인된 BOM 에서만(DB 트리거)", "역할별 권한(RBAC) · 사용자 관리(마지막 owner 강등 거부) · 테넌트 격리(RLS) · 감사 로그 ✓"],
        ["승인 권한은 회사 안(owner·engineer)뿐 — 플랫폼 단계 승인자 분리는 미정", "대장은 읽기 전용이다 — 상태 전이는 각 화면에서 한다(의도된 분리)"],
        "project:test · rls:test · e2e S27a~d · S29b~d · S11 · S17", "51_accepted"),
 56: pg("L", "E-1 · EDIM System Structure", "작업대 — 다섯 구역",
        ["Tool bar · Work Hierarchy · Main Work Place · Sub Work Place · Key Work Place 가 청사진 그대로 떠 있다"], ["EDIM Toolbar 의 업무 목록(고객 관리 … 시운전 요청) 없음"], "e2e S1", "10_project_bound"),
 57: pg("L", "E-2 · EDIM System Toolbar", "Toolbox Macro — 다섯 갈래 상호 연동",
        ["Prompt · Macro · Flowchart · Description · Coding 이 같은 매크로를 본다",
         "**함수 마법사**(H8) — v1 함수셋 13개를 골라 인자를 채우면 식 글자 → 기존 파서·Verify 그대로(Macro 탭 안에서 넣기) · **그래프 마법사** — 단계로 H6 그래프",
         "**Data Management**(H8) — Directory · Type of source(Table · Chart · Formula) 목록"],
        ["Enterprise DB(AI 학습 자료) — 필요한 입력: 회사 자료(M2) · AI 연결 결정(M5)"],
        "e2e S13b · S13c · S13e · S67a~e", "77_wizards"),
 58: pg("P", "E-2 · Toolbar Module", "Main Work place Toolbar",
        ["**명령 버튼이 돈다**: Arrangement ▼ · Move · Delete · Add · Copy · DWG View ▼ · 승인(Module)",
         "개념도에서 구획을 고르면 Move·Delete·Copy 가 풀리고, 편집은 Design 초안 → 기존 '저장' 한 곳으로만 반영된다",
         "**그림 제작 Module 1단계**(H10) — 도면 위 주석(선 · 사각형 · 글자 · 치수선) 추가·이동·삭제 · 원 도면 불변 · DXF 내보내기에 ANNOT 레이어 · 발행 도면은 잠김"],
        ["Free CAD · 설계 심볼은 잠긴 자리 — 필요한 결정: EDIM 안 CAD 편집기(M4 · M5)",
         "Delete 는 선택이 잠긴 구획이어도 눌리고 거부 문구로 막는다(표 쪽 Delete 는 미리 잠김) — 소프트웨어 몫"],
        "e2e S41a~l · S69a~f", "79_draw_module", "Free CAD 는 실제 CAD 편집기 결정 후"),
 59: pg("L", "E-3 · Key Work Place", "Hierarchy 와 Run 심볼",
        ["Work Hierarchy 트리에서 노드를 고르면 작업 대상이 호출된다", "EDIM Run · BOM Run · EBOM Run · Cost · Approval Request ✓"], ["Hierarchy(Edit) · Data Up-Load · DWG 폴더 없음"],
        "hierarchy:test · e2e S1 · S3", "10_project_bound"),
 60: pg("L", "E-4 · Sub Work Place / Coding", "EDIM Run — 같은 입력, 같은 답",
        ["승인된 식만 실행 · 실행에 LLM 없음 · 결과 455.4 재현", "매크로는 **서버가** 실행한다(클라이언트가 값을 보내지 않는다)"], ["Design Tool 범례: Key Dimension ✓ · Component Placement ✓ · Assembly Sequence ✓ · Design Verification ✓ — **Detail Dimension · QC/Material Note 는 아직**"],
        "e2e S5 · S13e · S20d", "14_edim_run"),
 61: pg("L", "E-4 · Sub Work Place / Code", "코드 조립 — A ▼ B ▼ C ▼ D ▼ E ▼ F ▼",
        ["슬롯 조립 → 규칙 검증 → VALID → 개정 저장(Rev A→B)", "등록 안 된 코드는 서버가 422 로 거부", "개정에 **슬롯 F 까지 포함**(회장님 결정 2026-09-22) — F 만 다른 미저장 조합은 근거 개정이 빈 값으로 남는다(S22f)"], ["Arrangement Code · Child Component Import/Export(Excel 연동) 없음"],
        "rccs 테스트 · e2e S2 · S2b · S2c · S8b · S22f · S28e", "11_code_builder"),
 62: pg("L", "E-4 · Sub Work Place / BOM", "BOM Run → EBOM Run → Cost → Document · Drawing · Export",
        ["BOM 11행 · 섹션별 EBOM · 원가 · 문서 · 도면 · Export 가 전부 돈다", "EBOM·Cost 는 다시 계산하지 않고 **스냅샷을 읽는다**"], ["단가는 샘플", "인건비는 제조 정보 표(F10)가 있으면 Σ 시간×임율, 없으면 배율 가정(18%) · 경비는 여전히 배율 가정(12%) — 실 값은 회사 자료가 필요"],
        "e2e S6a · S6b · S20a~S20c", "15_bom_cost"),
 63: pg("C", "간지", "Structure"),
 64: pg("L", "System Set-up 구조", "TLM Code Management · ERP Set-up",
        ["Sub Code · Product Code · Code relationship(BOM) Hierarchy ✓ · Approval management ✓", "3계층(플랫폼 → 회사 관리자 → 사용자) ✓",
         "**Company DB — Customer · Supplier**(⑧) · 수정 · 사용 중지 · 삭제(가리키면 409)(F2)",
         "**ERP 기준정보 6종**(H4) — Department Std. · Warehouse · Inventory · Bank · Employee · Nation · 서로 가리키는 관계(직원→부서 · 재고→창고 · 은행→국가 · 고객 Nation→국가) · 가리키면 삭제 409 · 값은 회사가 채움"],
        ["재고 입출고 흐름(Inventory Management) — 필요한 입력: 회사 재고 데이터"],
        "platform:test 25 · e2e S16 · S17 · S49a~e · S54a~e · S63a~e", "73_erp_master"),
 65: pg("L", "EDIM RUN", "Work Process — 한 번의 Run 에서 나오는 것들",
        ["Main Code → BOM → 도면 · 원가 · Tech Data · PCR·견적 · 구매 요청, **모두 한 BOM 스냅샷**에서", "구매 요청에서 거꾸로 **추적**: BOM → 코드 개정 → 카탈로그 지문 → 매크로 개정 → 승인"],
        ["Non-Standard Option(X Code) → R&D → New Code 흐름 없음", "Project 폴더 저장 구조 없음"],
        "e2e S20a~S20d · S22f · S28a~S28d", "45_purchasing"),
 66: pg("P", "D-3 · Pre-Calculation Report & Quotation", "PCR → Quotation",
        ["PCR(Material + Manufacturing = Direct Cost → Full cost) + 견적서 ✓", "견적 합계 = 스냅샷 원가 **그대로**",
         "**Manufacturing Cost Table**(F10) — 제품별 공정 시간 × 임율 · 장비 → 등록되면 Manufacturing Cost = Σ, 없으면 재료비 × 18% · 근거가 스냅샷에 박혀 견적서 '인건비 기준' 줄에"],
        ["PCR 세부(Procurement · Sub-manufacturing · Sales & Adm. · EBIT) · Business Type 열 없음", "단가는 샘플 — 구조 시연이다"],
        "e2e S22a~S22f · S62a~f · document:test", "46_quotation_print", "회장님 몫: 회사 실 단가표"),
 67: pg("L", "D-4 · Product cost Management", "단가 관리 Table",
        ["구매품 **단가 이력**(⑤-a) — 날짜별로 쌓고 현재·예정·지난을 가른다 · **Supplier** = Company DB 공급처(⑧)",
         "단가 이력 → 원가(E) — BOM Run 순간의 현재 단가가 줄에 박힌다(출처: 이력 날짜 · 관계값)",
         "**제조 정보**(F10) — 공정별 시간 · 임율 · 장비 → 인건비 = Σ 시간 × 임율(없으면 18%) · 표를 고쳐도 뜬 스냅샷·견적은 그대로",
         "**견적 적용 Table**(F10) — 견적서에 Code No · Price · Supplier · Price table(견적/구매) · 금액 합 = PCR Material Cost"],
        ["재고 단가 Table — 필요한 입력: 재고 데이터 · 장비(설비) 사용료 — 필요한 입력: 회사 설비 데이터"],
        "e2e S6b · S45d · S49c · S52a~g · S62a~f", "72_mfg_rate", "회사 실 단가표가 들어올 때 함께"),
 68: pg("C", "간지", "Work Process"),
 69: pg("N", "CTO Business Model", "파트너 · 모바일 ERP · QR", [], ["없음 — 파트너 연결 · 사무실 밖 업무(승인·입출고·검수) · QR 정보"], "", None, "EDIM 완료 후 확장 단계(회장님 확정)"),
 70: pg("C", "표지", "CTO, ETO Business Model Platform"),
}
assert sorted(PAGES) == list(range(1, 71))

# ── 이미지 ─────────────────────────────────────────────────────────────
def b64(im, q):
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=q, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def bp_img(page, maxw=1040):
    im = Image.open(os.path.join(CORPUS, f"{page}.jpeg")).convert("RGB")
    if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)), Image.LANCZOS)
    return b64(im, 70)

def shot_css():
    """같은 화면이 여러 장에 쓰인다 → 한 번만 싣고 CSS 클래스로 돌려 쓴다."""
    out = []
    for n in sorted({p["shot"] for p in PAGES.values() if p["shot"]}):
        path = os.path.join(SHOTS, n + ".png")
        if not os.path.exists(path): raise SystemExit(f"증빙 누락: {path}")
        im = Image.open(path).convert("RGB")
        im = im.crop((0, 0, im.width, min(im.height, int(im.width * 0.72))))
        if im.width > 1280: im = im.resize((1280, int(im.height * 1280 / im.width)), Image.LANCZOS)
        out.append(f".sh-{n}{{background-image:url({b64(im, 78)})}}")
    return "\n".join(out)

esc = lambda s: html.escape(s, quote=False)
def rich(s):  # **굵게** 만 허용
    parts = esc(s).split("**")
    return "".join(f"<b>{x}</b>" if i % 2 else x for i, x in enumerate(parts))

def counts(a=1, b=70):
    c = {k: 0 for k in ST}
    for p in range(a, b + 1): c[PAGES[p]["st"]] += 1
    return c

# ── 슬라이드 ───────────────────────────────────────────────────────────
def s_cover():
    c = counts()
    return f'''<section class="slide title"><div class="stage">
<div class="kick">EDIM · 청사진 70장 대조 · 엘 확정판</div>
<h1>70장 중<br><em>어디까지</em> 왔나</h1>
<p class="sub">청사진(EDIM.pdf) 70쪽을 한 장씩 실제 화면 옆에 놓았습니다. 도는 것은 도는 대로, 없는 것은 없는 대로 적었습니다.</p>
<div class="big4"><div class="b L"><i>{c["L"]}</i>실동</div><div class="b P"><i>{c["P"]}</i>부분</div><div class="b N"><i>{c["N"]}</i>미착수</div><div class="b C"><i>{c["C"]}</i>개념·표지</div></div>
<div class="meta">main {MAIN} · {DATE} · 엘 재측정 확정 — typecheck 11 · 단위 228 · DB 검증 9종 · e2e 287/287(운영 빌드 · 연결 수리본) · 회장님 조정 대상</div></div></section>'''

def s_grid():
    rows = ""
    for name, a, b in SECTIONS:
        cells = "".join(f'<span class="c {PAGES[p]["st"]}">{p}</span>' for p in range(a, b + 1))
        c = counts(a, b)
        rows += f'<div class="sec"><div class="sn">{esc(name)}<small>p{a}–{b}</small></div><div class="cs">{cells}</div><div class="sc">실동 {c["L"]} · 부분 {c["P"]} · 미착수 {c["N"]}</div></div>'
    c = counts(); tgt = 70 - c["C"]
    return f'''<section class="slide"><div class="stage"><header><span class="no">00</span><h2>한눈에 — 70장의 지금</h2></header>
<div class="cov1">{rows}</div>
<div class="legend"><span class="c L">n</span> 실동 {c["L"]} <span class="c P">n</span> 부분 {c["P"]} <span class="c N">n</span> 미착수 {c["N"]} <span class="c C">n</span> 개념·표지 {c["C"]}</div>
<footer>구현 대상 {tgt}장 가운데 실동 {c["L"]} · 부분 {c["P"]} · 미착수 {c["N"]}. <span class="src">이 수는 <b>덮은 범위</b>이지 깊이가 아닙니다 — '부분' {c["P"]}장의 깊이는 장마다 다르고, 각 장에 무엇이 없는지 적었습니다.</span></footer></div></section>'''

def s_rule():
    return f'''<section class="slide"><div class="stage"><header><span class="no">01</span><h2>읽는 법 — 판정 기준과 실측</h2></header>
<div class="honest">
<div class="h"><b>판정 네 가지</b><p><u>실동</u> 그 장의 핵심 동작이 화면에서 끝까지 돌고, e2e 나 DB 검증이 그것을 못 박고 있다.<br><u>부분</u> 일부만 돈다 — 도는 것과 없는 것을 둘 다 적는다.<br><u>미착수</u> 구현 대상인데 도는 것이 없다. <b>버튼 자리만 있는 것은 미착수로 셌다.</b><br><u>개념·표지</u> 구현 대상이 아닌 장. 반영된 곳이 있으면 적었다.</p></div>
<div class="h hb"><b>실측 (main {MAIN} · 엘 샌드박스)</b><p>typecheck 11 · 단위 테스트 189(vitest) + auth 12 PASS · 발표 시나리오 e2e <b>177/177</b><br>DB 검증 9종 전부 PASS: rls · revision 8 · project · hierarchy · macro 10 · backbone 14 · platform 25 · drawing 23 · document 37<br>회귀: 슬롯 1,200 조합에서 BOM 불변<br>각 장의 근거 칸에 적힌 S번호는 <code>scripts/demo_e2e.py</code> 의 단계 이름이다.</p></div>
<div class="h"><b>오른쪽 화면은 전부 실제 캡처</b><p>목업이 아니다. <code>demo_e2e.py</code> 가 매번 새로 찍는 화면이고, 이번부터 <code>docs/screens/</code> 에 함께 올렸다. 도면은 내려받은 DXF 를 ezdxf 로 다시 그린 것이다.</p></div>
<div class="h hc"><b>여전히 검증되지 않은 것</b><p><b>회장님 Windows PC 실행 0회</b> — 위 수치는 전부 엘 샌드박스(Linux) 기준.<br>표·단가는 샘플 · Prompt→Macro 실모델 호출 0회 · 도면은 선과 글자 수준.</p></div>
</div></div></section>'''

def s_sections():
    bars = ""
    for name, a, b in SECTIONS:
        c = counts(a, b); n = b - a + 1
        seg = "".join(f'<i class="{k}" style="flex:{c[k]}"></i>' for k in "LPNC" if c[k])
        bars += f'<div class="bar"><div class="bn">{esc(name)}</div><div class="bt">{seg}</div><div class="bv">{c["L"]} · {c["P"]} · {c["N"]} · {c["C"]}</div></div>'
    return f'''<section class="slide"><div class="stage"><header><span class="no">02</span><h2>절마다 — 어디가 두껍고 어디가 비었나</h2></header>
<div class="bars">{bars}<div class="bar bl"><div class="bn"></div><div class="bt lg"><span><i class="L"></i>실동</span><span><i class="P"></i>부분</span><span><i class="N"></i>미착수</span><span><i class="C"></i>개념·표지</span></div><div class="bv">실동·부분·미착수·표지</div></div></div>
<footer>두꺼운 곳: <b>Form(작업대)</b> · <b>BOM Code Set-Up</b> · <b>Product Selection(산출물)</b>. 빈 곳: <b>Arrangement</b>(p13·35·36·46) · <b>Drawing Data Set-Up</b>(p42~44) · <b>AI 학습 DB</b>(p23). <span class="src">빈 곳 셋은 각각 회장님 우선순위 결정 · CAD 담당 입력 · DXF 연구 결과를 기다린다.</span></footer></div></section>'''

def s_page(p):
    m = PAGES[p]; st = m["st"]
    have = "".join(f"<li>{rich(x)}</li>" for x in m["have"])
    gap = "".join(f"<li>{rich(x)}</li>" for x in m["gap"])
    if m["shot"]:
        right = f'<div class="shotbg sh-{m["shot"]}"></div>'
        lab = f'<b>{"자리만 있음" if st == "N" else "실제 화면"}</b><i>{esc(m["shot"])}.png</i>'
    else:
        msg = {"N": "아직 도는 것이 없습니다", "C": "구현 대상이 아닌 장입니다"}.get(st, "")
        right = f'<div class="slot {st}"><div class="slot-k">{ST[st]}</div><div class="slot-n">{msg}</div></div>'
        lab = f'<b>{ST[st]}</b><i>화면 없음</i>'
    ev = f'<div class="ev"><b>근거</b> {esc(m["ev"])}</div>' if m["ev"] else ""
    nx = f'<span class="src">다음 — {esc(m["nx"])}</span>' if m["nx"] else ""
    lists = (f'<ul class="ok">{have}</ul>' if have else "") + (f'<ul class="ng">{gap}</ul>' if gap else "")
    return f'''<section class="slide"><div class="stage"><header><span class="no">p{p}</span><h2>{esc(m["title"])}</h2><span class="badge {st}">{ST[st]}</span></header>
<div class="pair"><figure class="bp"><div class="lab"><b>청사진</b><i>p{p} · {esc(m["tag"])}</i></div><img src="{bp_img(p)}" alt=""></figure>
<div class="arrow">→</div>
<figure class="live {st}"><div class="lab">{lab}</div>{right}{lists}{ev}</figure></div>
<footer class="pf">{nx}</footer></div></section>'''

def s_remaining():
    return '''<section class="slide"><div class="stage"><header><span class="no">끝1</span><h2>남은 작업 — 엘·CC 가 지시만 받으면 하는 것</h2></header>
<div class="own"><table class="ot"><thead><tr><th>#</th><th>작업</th><th>왜 엘·CC 가 할 수 있나</th><th>선행 조건</th><th>나오는 것</th></tr></thead><tbody>
<tr><td>E2</td><td><b>배포 환경 점검</b> — 연결 고갈 수리본은 main 에 들어갔다(09-27 밤 · 운영 모드 e2e 연결 15~16). 남은 것: 배포 대상 환경의 DB·비밀값·도메인 점검</td><td>머지 게이트에 운영 모드 e2e 가 상시로 들어갔다</td><td>배포 결정(M5) 뒤</td><td>p9 선행</td></tr>
<tr><td>E4</td><td>EDIM 안 CAD 편집기 · 설계 심볼 · 제작도 수준 도면 — 주석 레이어 1단계(H10)는 끝, 실제 도형 편집은 아직</td><td>도면 선·치수 전파는 결정론으로 돈다</td><td>회사 CAD 규칙(M4) · 편집기 결정(M5)</td><td>p58 · 38</td></tr>
<tr><td>E5</td><td>발표 덱 · 진행현황 보고서를 이번 main 반영본으로 재생성</td><td>생성기가 repo 에 있다</td><td>이 판정을 회장님이 조정한 뒤</td><td>덱 · 진행현황 새 판</td></tr>
<tr><td>E6</td><td>Macro 로 쓰는 설계 검증(p39) — 지금은 규칙 표(p36)</td><td>매크로 실행기·검증 규칙 표가 이미 돈다</td><td>없음 — 지시만</td><td>p39 부분 → 실동</td></tr>
<tr><td>E7</td><td>인쇄본 Office 내보내기(.docx · .xlsx) — 지금은 브라우저 PDF</td><td>인쇄본은 스냅샷 body 에서만 나온다(그대로 옮기면 된다)</td><td>없음 — 지시만</td><td>p48 부분 → 실동</td></tr>
<tr><td>E8</td><td>툴바 Delete — 잠긴 구획이면 미리 잠그기(표 쪽과 같게)</td><td>작은 화면 일관성 수정</td><td>없음 — 지시만</td><td>p58 gap 하나</td></tr>
</tbody></table>
<p class="onote">09-27 밤(ccmd H) 끝낸 것: 연결 고갈 수리 머지 · 시연 안전판 태그 · H4 ERP 기준정보 6종 · H5 Sub Drawing·주의사항 · H6 Output·그래프·Table List · H7 Coding List · H8 함수·그래프 마법사·Data Management · H9 인쇄 양식 편집기 · H10 도면 주석 → 5쪽 부분 → 실동(초안 — 엘 재측정 후 확정).</p>
</div></div></section>

<section class="slide"><div class="stage"><header><span class="no">끝2</span><h2>남은 작업 — 회장님·사장님 자료와 결정이 필요한 것</h2></header>
<div class="own"><table class="ot"><thead><tr><th>#</th><th>작업</th><th>왜 엘이 못 하나</th><th>여는 쪽</th><th>주시면 되는 것</th></tr></thead><tbody>
<tr><td>M1</td><td><b>회사 실 단가 · 표 · 계산서 양식</b></td><td>회사 자료다 — 지금 수치는 전부 샘플</td><td>p15 · 62 · 66 · 67</td><td>엑셀·표 파일</td></tr>
<tr><td>M2</td><td>DXF 추출 연구 결과 → 학습 DB(DB①)</td><td>회장님이 직접 연구 중인 자료</td><td>p21 · 23</td><td>결과 파일·정리</td></tr>
<tr><td>M3</td><td><b>사장님</b> D1 — Special Tool Box 첫 사례</td><td>사장님 영역</td><td>Special 슬롯</td><td>사례 1건</td></tr>
<tr><td>M4</td><td>회사 CAD 규칙 — mm 배치 · 기준점 · KAD-□ 슬롯 문법 · 코드 Group 분류</td><td>CAD 담당 자료다</td><td>p28 · 30 · 35 · 36 · 38 · 42</td><td>규칙 문서·예시 도면</td></tr>
<tr><td>M5</td><td>결정 — 배포 여부 · 비밀번호/SSO 방향 · AI 키</td><td>결정·비용은 회장님 권한</td><td>p9 · 11 · 25 · 26</td><td>한 줄 결정 · 키 1개</td></tr>
<tr><td>M6</td><td>CI 워크플로 배선 — <code>docs/ci/ci.yml</code> → <code>.github/workflows/</code></td><td>토큰에 Workflows 권한이 없다</td><td>—</td><td>GitHub 웹에서 파일 추가(2분)</td></tr>
</tbody></table>
<p class="onote">범위 밖(회장님 확정): p43·p44 생산·MES · p69 파트너·모바일·QR — EDIM 완료 후 확장 단계(ERP → Digital Twin → AR·XR).</p>
</div></div></section>'''

EXTRA_CSS = '''
.own{flex:1;display:flex;flex-direction:column;justify-content:center;gap:1.2cqw}
.ot{width:100%;border-collapse:collapse;font-size:1.12cqw;line-height:1.45}
.ot th{text-align:left;font-size:1.05cqw;color:var(--mut);font-weight:700;border-bottom:.14cqw solid var(--line);padding:.55cqw .7cqw}
.ot td{padding:.55cqw .7cqw;border-bottom:.1cqw solid var(--line);vertical-align:top;color:var(--ink)}
.ot td:first-child{font-family:'JetBrains Mono',monospace;color:var(--teal);font-weight:700;width:3.4cqw}
.ot td b{color:var(--hl)}.ot code{font-family:'JetBrains Mono',monospace;font-size:.98cqw;color:var(--teal)}
.onote{font-size:1.12cqw;color:var(--mut);line-height:1.5;border-left:.22cqw solid var(--amber);padding-left:1cqw}
.onote b{color:var(--hl)}
.badge{margin-left:auto;font-size:1.25cqw;font-weight:800;padding:.3cqw 1.1cqw;border-radius:2cqw;letter-spacing:.04em;white-space:nowrap}
.badge.L,.c.L,.b.L i,.bt i.L{background:var(--teal);color:#04241e}.badge.P{background:transparent;color:var(--amber);border:.16cqw solid var(--amber)}
.badge.N{background:transparent;color:var(--coral);border:.16cqw solid var(--coral)}.badge.C{background:transparent;color:var(--mut);border:.12cqw solid var(--line)}
h2{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}header{align-items:center}
.pair{grid-template-columns:1.06fr 2.4cqw 1fr}
.shotbg{flex:1;min-height:0;background-size:contain;background-repeat:no-repeat;background-position:top center;border-radius:.5cqw;border:.1cqw solid var(--line);background-color:var(--shotbg)}
figure.live ul{list-style:none;display:flex;flex-direction:column;gap:.3cqw;padding:0}
figure.live li{font-size:1.1cqw;line-height:1.42;padding-left:1.4cqw;position:relative;color:var(--ink)}
figure.live li b{color:var(--hl)}
ul.ok li:before{content:"✓";position:absolute;left:0;color:var(--teal);font-weight:800}
ul.ng li:before{content:"△";position:absolute;left:0;color:var(--amber);font-weight:800;font-size:.95cqw}
figure.live.N ul.ng li:before,figure.live.N{border-color:var(--coral)}figure.live.N ul.ng li:before{content:"✕";color:var(--coral)}
figure.live.C{border-color:var(--line)}figure.live.P{border-color:var(--amber)}
.ev{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.92cqw;color:var(--mut);border-top:.1cqw solid var(--line);padding-top:.5cqw;line-height:1.4}.ev b{color:var(--teal);margin-right:.5cqw;font-family:inherit}
.slot{min-height:0}.slot.N{border-color:var(--coral)}.slot.N .slot-k{color:var(--coral)}.slot.C{border-color:var(--line)}.slot.C .slot-k{color:var(--mut)}.slot-k{font-size:2.4cqw}.slot-n{font-size:1.2cqw}
footer.pf{border:none;padding:0;min-height:1.4cqw;margin-top:0;font-size:1.15cqw}footer.pf .src{font-size:1.15cqw;color:var(--mut)}
.big4{display:flex;gap:1.4cqw;margin-top:1cqw}.b{font-size:1.4cqw;color:var(--mut);display:flex;flex-direction:column;gap:.4cqw;min-width:11cqw}
.b i{font-style:normal;font-size:4.6cqw;font-weight:900;line-height:1;width:fit-content;padding:.3cqw 1.2cqw;border-radius:.8cqw}
.b.P i{color:var(--amber);border:.2cqw solid var(--amber)}.b.N i{color:var(--coral);border:.2cqw solid var(--coral)}.b.C i{color:var(--mut);border:.16cqw solid var(--line)}
.cov1{flex:1;display:flex;flex-direction:column;justify-content:center;gap:.75cqw}
.sec{display:grid;grid-template-columns:19cqw 1fr 17cqw;align-items:center;gap:1.2cqw}.sn{font-size:1.25cqw;color:var(--ink);text-align:right;font-weight:600}.sn small{display:block;color:var(--mut);font-weight:400;font-size:.95cqw}
.sc{font-size:1.05cqw;color:var(--mut);font-family:'JetBrains Mono',monospace}
.c.P{background:transparent;color:var(--amber);border:.16cqw solid var(--amber);font-weight:700}.c.N{background:transparent;color:var(--coral);border:.16cqw solid var(--coral);font-weight:700}.c.C{opacity:.55}
.legend .c.L,.legend .c.P,.legend .c.N,.legend .c.C{color:transparent}
.bars{flex:1;display:flex;flex-direction:column;justify-content:center;gap:1cqw}.bar{display:grid;grid-template-columns:21cqw 1fr 12cqw;gap:1.4cqw;align-items:center}
.bn{text-align:right;font-size:1.35cqw;font-weight:600}.bt{display:flex;height:2.1cqw;border-radius:.5cqw;overflow:hidden;gap:.15cqw}.bt i{display:block}
.bt i.P{background:var(--amber)}.bt i.N{background:var(--coral)}.bt i.C{background:var(--line)}.bv{font-family:'JetBrains Mono',monospace;font-size:1.1cqw;color:var(--mut)}
.bt.lg{height:auto;gap:2cqw;overflow:visible;font-size:1.1cqw;color:var(--mut)}.bt.lg span{display:flex;align-items:center;gap:.5cqw}.bt.lg i{width:1.4cqw;height:1.4cqw;border-radius:.3cqw}.bl .bv{font-size:.9cqw}
.h p{font-size:1.42cqw;line-height:1.62}.h p b{font-size:inherit}.h b{font-size:1.9cqw}.honest{gap:1.4cqw}.h{padding:2cqw 2.2cqw}
.h code{font-family:'JetBrains Mono',monospace;font-size:1.05cqw;color:var(--teal)}.h p b{color:var(--hl)}
'''

def build(theme):
    css = open(os.path.join(DECK, "deck.css"), encoding="utf-8").read()
    light = open(os.path.join(DECK, "deck_light.css"), encoding="utf-8").read() if theme == "light" else ""
    var = ":root{--shotbg:#05080d;--hl:#ffffff}" if theme == "dark" else ":root{--shotbg:#ffffff;--hl:#0b1626}.badge.L,.c.L,.b.L i{color:#fff}.b i{background:transparent}.b.L i{background:var(--teal)}"
    body = s_cover() + s_grid() + s_rule() + s_sections() + "".join(s_page(p) for p in range(1, 71)) + s_remaining()
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EDIM — 청사진 70장 대조 ({DATE})</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>{css}\n{light}\n{var}\n{EXTRA_CSS}\n{shot_css()}</style></head><body>{body}</body></html>'''

def page_map_md():
    c = counts()
    out = [f"# 청사진 페이지 색인 — 70장의 지금 (main `{MAIN}` · {DATE})", "",
           "> 이 파일은 `docs/02-reports/build_blueprint_match.py` 의 판정 데이터에서 **자동 생성**된다. 손으로 고치지 말 것.",
           f"> 실동 {c['L']} · 부분 {c['P']} · 미착수 {c['N']} · 개념·표지 {c['C']} (합 70). 판정은 엘의 것 — 회장님 조정 대상.", ""]
    for name, a, b in SECTIONS:
        out += [f"## {name} (p{a}–{b})", "", "| 쪽 | 판정 | 제목 | 도는 것 | 없는 것 | 근거 |", "|---|---|---|---|---|---|"]
        for p in range(a, b + 1):
            m = PAGES[p]; f = lambda xs: "<br>".join(x.replace("**", "").replace("|", "/") for x in xs) or "—"
            out.append(f"| p{p} | {ST[m['st']]} | {m['title'].replace('|','/')} | {f(m['have'])} | {f(m['gap'])} | {m['ev'] or '—'} |")
        out.append("")
    return "\n".join(out)

if __name__ == "__main__":
    os.makedirs(OUTDIR, exist_ok=True)
    for theme, name in (("dark", f"EDIM_청사진70장_대조_{DATE.replace('-', '')}.html"), ("light", "_print.html")):
        open(os.path.join(OUTDIR, name), "w", encoding="utf-8").write(build(theme))
    open(os.path.join(OUTDIR, "page-map.md"), "w", encoding="utf-8").write(page_map_md())
    c = counts(); print("pages 70 ·", " · ".join(f"{ST[k]} {c[k]}" for k in "LPNC"), "· slides", 70 + 5)
