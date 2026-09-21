#!/usr/bin/env python3
"""EDIM 청사진 70장 대조 보고서 (점검 초안) — 생성기

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
MAIN = sys.argv[4] if len(sys.argv) > 4 else "1b7625e"
DATE = "2026-09-21"
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

# ── 판정 데이터 (청사진 70쪽 전수 정독 2026-09-21 · repo main 실측 · 화면은 스크린샷을 눈으로 확인) ──
PAGES = {
 1: pg("C", "표지", "CTO Business Platform — EDIM", ["CPQ + PLM + ERP + D.T 통합이라는 정체성은 repo README 첫 문장과 발표 덱의 출발점이다"]),
 2: pg("C", "간지", "System concept"),
 3: pg("C", "개념", "CTO Business — As-is / To-be",
       ["\"제품 Configuration 선정과 동시에 모든 업무 자료 생성\" — 코드 한 줄에서 BOM·도면·원가·견적·Tech Data·구매 요청이 **한 BOM 스냅샷**으로부터 나오는 것까지 얇게 실증"],
       ["수작업 입력·오류가 실제로 줄었는지는 회사 실 데이터로 재 본 적이 없다"], shot="44_document_tab"),
 4: pg("C", "개념", "System Integration — 생성 자료 5종",
       ["BOM / Part List ✓ · Tech Data ✓(1종) · DWG 2D ✓(평면·조립) · Cost ✓(단가 샘플)"],
       ["DWG 3D · Work Process 산출 없음", "ERP 연계는 구매 요청까지 · Smart Factory·AR/XR 은 EDIM 완료 후 확장 단계(회장님 확정)"], shot="15_bom_cost"),
 5: pg("L", "EDIM / Code", "Real-Time Code connectivity — 코드 한 줄이 회사를 관통한다",
       ["제품 선정(Code 생성) → Part-List(Code 연결) → DWG(Code 기반) → Cost → 견적 → 구매 요청이 끊기지 않고 이어진다", "연결 장부 14고리 중 **이어짐 11 · 약함 0 · 없음 3**"],
       ["Product(Code QR) · Manufacturing/MES 고리 없음", "남은 '없음' 3: 승인↔Rev·BOM(P6) · DB①→DB②(P3-b) · Special(P3-c)"],
       "docs/plan/connection-ledger.md · e2e S8 · S18c · S22b · S24a", "15_bom_cost", "P6 통합에서 '사람 재입력 0'을 한 코드로 끝까지 증명"),
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
 12: pg("P", "ERP / Sale / Project Management", "프로젝트 등록·관리",
        ["프로젝트 PS-61313-5 가 Hierarchy 노드에 묶이고 Inspector 에 Type·Client·Stage(견적)가 뜬다"],
        ["/m/project 화면은 **목록 한 줄**이다 — 영업 단계 전이, Client 담당자 정보, 접수 자료 등록(File), Edit Table 없음"],
        "project:test · e2e S1", "05_project_mgmt", "P6 통합에서 승인 파이프라인과 함께 보강"),
 13: pg("P", "C-1 · ERP / CPQ / Selection Template", "Selection Template",
        ["Product Code 표시 · BOM / EDIM Run / Quotation·PCR / Drawing 버튼과 목록 ✓", "Arrangement 개념도(구성 구획) ✓"],
        ["Arrangement · Move · Delete · Add Item · DWG View 는 **버튼 자리만 있고 동작이 없다**", "Sub Item list · Schedule management 없음"],
        "e2e S21a · S21b", "16_design_tab", "Arrangement 는 p35~36 과 한 묶음 — 회장님 우선순위 결정 필요"),
 14: pg("L", "공기조화기 사양", "사양표 — 우리 제품의 말로",
        ["BOM 의 사양 열이 p14 문구 그대로 나온다(Base Frame · Casing · Fan · Coil · Damper)"],
        ["'다단계 Option 추적' 은 슬롯 조건(when) 한 단계 수준"], "e2e S6a", "15_bom_cost"),
 15: pg("P", "C-2 · ERP / CPQ / Tech.", "Technical Data",
        ["Tech Data 문서 1종: 결과값 + **그 값을 낸 승인 매크로 개정·원문** + 입력 슬롯, 번호·개정·상태·발행 잠금"],
        ["Arrangement 방향(L0~R270) 선택 · Import · Technical data 목록 없음", "매크로 결과 1값뿐 — 기술 계산서 수준이 아니다"],
        "e2e S23a · S23b · document:test 28", "47_techdata_print", "회사 실 기술 계산식이 들어와야 깊어진다(회장님·사장님 자료)"),
 16: pg("P", "C-2 · Document Template", "Document Template · Edit Table",
        ["Edit Table = Set-Up 의 제품 코드 표 편집 ✓ — 한 칸을 고치면 BOM·매크로·도면이 따라 바뀐다", "Output Data 인쇄 ✓"],
        ["Input Data 템플릿(온도·습도·밀도 + 단위) 없음", "Table Type 은 tech·dim 두 종뿐(Variant·Material 없음) · Data Up-Load 없음"],
        "e2e S10b · S10d · S18b", "21_setup_product_table"),
 17: pg("L", "CPQ / Document", "네 가지 산출물 — BOM · Quotation · Document · Drawing",
        ["네 가지 모두 화면에서 나오고, **모두 같은 BOM 스냅샷 하나**를 입력으로 받는다", "문서·도면은 번호·개정(A→B)·상태 4단계·발행 잠금"],
        ["Approval Drawing / Manufacturing Drawing 구분 없음(평면도·조립도 2종)", "'준비시간 1시간 이내' 는 재 본 적 없다"],
        "e2e S25b · S19a~S19e · S22d", "44_document_tab"),
 18: pg("P", "PLM > Set-Up > Work Process > Design", "작업 화면 틀 — Hierarchy · Approval · Schedule",
        ["Hierarchy · Description · Approval(단계 요청) ✓"], ["Schedule management(To-do · Done · Schedule · Approval Request List) 없음 — Inspector 에 '일정 없음'", "Data Up-Load 없음"],
        "e2e S1", "10_project_bound"),
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
        ["Revisions: 개정 번호(A,B,…)·사유·개정자, **append-only**(앱 역할에 UPDATE/DELETE 권한 없음)", "Drawings: 번호·유형·현재 개정·상태(작성중/검토/승인/발행), 발행은 DB 트리거가 잠근다"],
        ["Parts · BOM · Material 테이블은 코드 카탈로그 + BOM 스냅샷 구조로 대체(GAP1 결정)", "scale · size 열 없음"],
        "revision:test · drawing:test 14 · e2e S2b~S2d · S19", "11b_revisions"),
 25: pg("P", "S-2 · EDIM Toolbox UI", "사용자 UI Form — Command button · Combo box · Templet",
        ["Command button set-up ✓ — 보이기·순서 변경이 MainForm Action Bar 에 **즉시 반영**, 기본값 복원"],
        ["Combo box set-up · 여러 동작을 정의한 Templet · Canvas Drag 없음(화면에도 그렇게 적혀 있다)", "UI 개발 AI(설명을 주면 UI 자동 설계) 없음"],
        "e2e S14a · S14b", "31_toolbox_ui_tool"),
 26: pg("N", "S-2-1 · Set-Up / EDIM UI Design", "UI Design 작업장",
        [], ["Set-Up 안의 UI Design 작업장(Work Hierarchy 별 UI · Sample Templet 호출)은 없다", "p25 의 Command button 한 가지만 Toolbox 창에 있다"], "", None, "Toolbox 깊이는 회장님 우선순위 결정 후"),
 27: pg("L", "S-2-2 · EDIM Toolbox Macro", "매크로 — 제안 → 검토 → 승인",
        ["Verify(정적 검증 + dry-run) → 초안 → 승인 → revision 상승, 승인본만 공식 Run", "Table 참조 · Flowchart · Description(결정론 역번역) ✓"],
        ["Prompt → Macro 는 경로만 있고 **실모델 호출 0회**(API 키 없음)", "함수 마법사 · 그래프 마법사 · Address 찾기 없음"],
        "macro 테스트 · e2e S4a~S4c · S13b~S13f", "13_macro_approved", "회장님 몫: API 키로 Prompt 1회 확인"),
 28: pg("P", "Macro 예제", "도면 풍선번호 · Item 표 · KAD-□□□ 슬롯",
        ["조립도에 Item 표와 풍선번호가 들어간다"], ["부품 더블클릭 정보 관리 없음", "KAD-□□□ 슬롯 ↔ Key Dimension 대응 **문법 미정**", "조립순서·주의사항 없음"],
        "e2e S18f", "49_dxf_assembly", "슬롯 문법은 RCCS 사안 — 회장님 결정"),
 29: pg("C", "간지", "BOM Code Set-Up — 관계형 BOM Code / RCCS™"),
 30: pg("P", "Code Set-Up 개요", "여섯 가지 등록",
        ["Sub Code ✓ · Product code ✓ · Product Code Relationship ✓"],
        ["Material code & Purchase items 는 제품 코드 종류(kind=purchase) 로만 존재", "Arrangement code · Arrangement Drawing Control 없음"], "e2e S9a · S9b · S10a", "20_setup_subcode"),
 31: pg("L", "S-1-1 · Set-up / PLM / Sub Code", "Sub Code Registration",
        ["그룹·항목·값을 등록하면 MainForm Code Builder 드롭다운에 바로 나타난다"], ["Approval Status · 3D/2D DWG 첨부 없음"],
        "e2e S9a · S12a · S12b", "20_setup_subcode"),
 32: pg("N", "S-1-2 · Material code & General purchase items", "자재·구매 품목 코드 등록",
        [], ["전용 등록 화면이 없다 — 구매 품목은 제품 코드의 kind=purchase 와 관계의 단가로만 존재", "V·Hz·IP·Insulation·Efficiency·Supplier 속성 · Price Table 없음"],
        "", None, "구매 요청(p51)의 Supplier 열이 비어 있는 원인 — 우선순위는 회장님 결정"),
 33: pg("L", "S-1-3 · Set-up / PLM / Product Code", "Product Code + 표",
        ["제품 코드와 그 표(tech · dim) 등록·편집 ✓", "표를 고치면 BOM · 매크로 · 도면이 따라 바뀐다"], ["3D/2D DWG 첨부 · Data Up-Load 없음"],
        "e2e S10a · S10b · S10d", "21_setup_product_table"),
 34: pg("L", "S-1-4 · Product Code Relationship", "Child Group — 코드 관계가 곧 BOM",
        ["Child Group · Q'ty · 조건 · 코드 상속(p34) ✓ · Part List Running Test ✓", "BOM 은 슬롯 규칙 함수가 아니라 **등록된 관계를 돌린 결과**다"],
        ["다단 BOM(하위의 하위) 없음"], "e2e S8 · S9b~S9d · 회귀 1,200 조합 · backbone:test 13", "22_setup_relationship"),
 35: pg("N", "S-1-5 · Arrangement Code", "Arrangement 코드 등록", [], ["없음"], "", None, "p13 · p36 · p46 과 한 묶음"),
 36: pg("N", "S-1-6 · Arrangement Set-Up", "Key / Detail Dimension · Component · Design Verification",
        [], ["Key Dimension 만 표로 존재(→ p38). Detail Dimension · Component 배치 · 방향(L0~R270) · Design Verification(Macro) 없음"], "", None, "p35 와 한 묶음"),
 37: pg("C", "간지", "EDIM Drawing Management — DWG Set-Up"),
 38: pg("P", "PLM / Design Drawing / Set-Up / Macro", "치수 전파 — 표를 고치면 도면이 바뀐다",
        ["Key Dimension 표(W·H·L) → DXF. 한 칸 2472→2600 이면 **폭만** 따라 바뀐다(ezdxf 로 파싱해 확인)", "평면도·조립도 2종 · 번호·개정·상태·발행 잠금"],
        ["도면은 아직 **선과 글자** 수준 — 제작도가 아니다", "Detail Dimension · 부품도 · KAD-□ 슬롯 문법 없음"],
        "e2e S18a~S18f · S19a~S19e · drawing:test 14", "43_drawings", "DXF 연구 결과와 CAD 담당의 Drawing Set-Up 입력이 필요"),
 39: pg("P", "Set-Up / PLM / Work Process / Design", "도면 Templet 호출 설정 6단계",
        ["1) Product Item 호출 ✓ · 도면 치수 ✓ · 사용 승인 절차(상태 4단계) ✓"], ["하부 도면 호출 · 도면 구성 설정 · 설계 우선순위 · 조립 방식/설계 검증 Macro 없음"],
        "e2e S7 · S18a", "48_dxf_plan"),
 40: pg("P", "Work Process / Design", "Call Sub Drawing · Assembling · Detail Design",
        ["조립도 1장에 Item 표 + 풍선번호"], ["Sub Drawing 호출 · Detail Design 없음"], "e2e S18f", "49_dxf_assembly"),
 41: pg("C", "간지", "EDIM Drawing Management — Data Set-Up"),
 42: pg("N", "Data Set-Up", "설계 우선순위 · 기준점 · 오류 체크 · Material management", [], ["없음 (CAD Mapping · Variant List · Inventory 포함)"], "", None, "CAD 담당 영역(역할 분담 확정)"),
 43: pg("N", "S-4-1-2 · Work Process Management", "전 부서 Work Process — 창고·공정·인원·스킬·시간", [], ["없음"], "", None, "ERP 확장 — 80% 범위 밖"),
 44: pg("N", "Table List · Manufacturing", "MRP · 작업지시 · 공정 · 자재흐름 · 품질 · 원가", [], ["Table List 중 tech·dim 표만 존재. 생산계획·작업지시·공정·품질 없음"], "", None, "ERP/MES 확장 — 80% 범위 밖"),
 45: pg("C", "간지", "Selection & Document Set-Up — Arrangement"),
 46: pg("N", "S-3-1 · Set-up / CPQ / Selection", "Selection Set-Up — Spec List input", [], ["Arrangement 형식 정의 · Option 정의 · 사양 입력표 없음"], "", None, "p35~36 과 한 묶음"),
 47: pg("P", "S-3-2,3 · Tech. Data & Document Set-Up", "Coding + Run + Table",
        ["Coding(매크로) + Run + 참조 Table ✓"], ["Input/Output Data 템플릿 · 그래프 전용 data · Coding List(노드당 승인 매크로 1개) 없음"], "e2e S5 · S10d", "13_macro_approved"),
 48: pg("P", "S-3-4 · Print Set-up", "인쇄",
        ["견적서·Tech Data **인쇄본(흰 A4)** ✓ — 브라우저에서 PDF 저장"], ["Print Set-up 화면(양식 배치 · 워터마크 · 폰트 · 머리글/바닥글 · 용지) 없음 — 양식은 종류당 하나로 고정"],
        "e2e S22c", "46_quotation_print"),
 49: pg("C", "간지", "User Set-Up"),
 50: pg("P", "Set-Up / User ERP / Sale / Project Management", "프로젝트 관리(사용자 ERP)",
        ["p12 와 같은 화면 — 프로젝트 등록·노드 바인딩·Stage 표시"], ["영업 단계 전이 · 담당자 · 접수 자료 없음"], "project:test · e2e S1", "05_project_mgmt"),
 51: pg("L", "S-3-5 · User ERP / Material / Purchase", "구매 요청 → 견적 요청 → 발주",
        ["PR No · BOM No(스냅샷) · Project No · Process(견적 요청 → 발주) · PO No · BOM List ✓", "줄은 그 BOM 에서 **구매 품목이던 것만**, 한 BOM 으로 두 번 못 산다, 발주되면 잠긴다 · Export CSV"],
        ["Supplier 선택 · Stock list Check · Delivery terms 없음(→ p32)"], "e2e S24a~S24c · S26a~S26d · document:test 28", "45_purchasing", "Supplier 는 p32 자재 코드 등록이 먼저"),
 52: pg("L", "S-3-5 (중복 장)", "구매 요청 — p51 과 같은 화면", ["p51 과 동일"], ["p51 과 동일"], "e2e S26b · S26d", "45_purchasing"),
 53: pg("C", "간지", "Form"),
 54: pg("P", "System Set-Up", "Set-Up 메뉴 지도",
        ["1. Code — Sub code · Product Code · Code Relationship ✓", "EDIM Tool — Macro ✓ · UI Design 일부"], ["Arrangement Code/Set-up · TLM Design · CPQ Selection · Print Set-up 없음", "User ERP 는 구매 요청만"],
        "e2e S9 · S10 · S12", "23_codebuilder_from_subcode"),
 55: pg("L", "System Set-Up", "Approval Management · Authorization · Security",
        ["Design → Check → Approve → Accepted 승인 단계 ✓", "역할별 권한(RBAC) · 사용자 관리(마지막 owner 강등 거부) · 테넌트 격리(RLS) · 감사 로그 ✓"],
        ["DOC No · Version · Released 를 모아 보는 승인 대장 화면 없음", "승인이 아직 코드 Rev·BOM 과 묶여 있지 않다(P6)"],
        "project:test · rls:test · e2e S11 · S17a · S17b", "42_user_management", "P6 통합"),
 56: pg("L", "E-1 · EDIM System Structure", "작업대 — 다섯 구역",
        ["Tool bar · Work Hierarchy · Main Work Place · Sub Work Place · Key Work Place 가 청사진 그대로 떠 있다"], ["EDIM Toolbar 의 업무 목록(고객 관리 … 시운전 요청) 없음"], "e2e S1", "10_project_bound"),
 57: pg("P", "E-2 · EDIM System Toolbar", "Toolbox Macro — 다섯 갈래 상호 연동",
        ["Prompt · Macro · Flowchart · Description · Coding 이 같은 매크로를 본다"], ["Data Management(Directory · Type of source: Table/Chart/Formula drawing) 없음", "함수 마법사 · 그래프 마법사 없음"],
        "e2e S13b · S13c · S13e", "30_toolbox_program"),
 58: pg("N", "E-2 · Toolbar Module", "Main Work place Toolbar",
        [], ["Arrangement · Move · Delete · Add · DWG · View · Free CAD · 설계 심볼 · 승인 — 버튼 줄은 청사진 순서대로 있지만 **눌러도 동작하는 것이 없다**", "그림 제작 Module 없음 (Action Bar 편집은 p25 의 것이라 여기서 세지 않았다)"],
        "", "16_design_tab", "Arrangement 묶음(p13·35·36·46)과 함께 — 회장님 우선순위 결정"),
 59: pg("L", "E-3 · Key Work Place", "Hierarchy 와 Run 심볼",
        ["Work Hierarchy 트리에서 노드를 고르면 작업 대상이 호출된다", "EDIM Run · BOM Run · EBOM Run · Cost · Approval Request ✓"], ["Hierarchy(Edit) · Data Up-Load · DWG 폴더 없음"],
        "hierarchy:test · e2e S1 · S3", "10_project_bound"),
 60: pg("L", "E-4 · Sub Work Place / Coding", "EDIM Run — 같은 입력, 같은 답",
        ["승인된 식만 실행 · 실행에 LLM 없음 · 결과 455.4 재현", "매크로는 **서버가** 실행한다(클라이언트가 값을 보내지 않는다)"], ["Design Tool 범례 중 Key Dimension 만 실제"],
        "e2e S5 · S13e · S20d", "14_edim_run"),
 61: pg("L", "E-4 · Sub Work Place / Code", "코드 조립 — A ▼ B ▼ C ▼ D ▼ E ▼ F ▼",
        ["슬롯 조립 → 규칙 검증 → VALID → 개정 저장(Rev A→B)", "등록 안 된 코드는 서버가 422 로 거부"], ["Arrangement Code · Child Component Import/Export(Excel 연동) 없음"],
        "rccs 테스트 · e2e S2 · S2b · S2c · S8b", "11_code_builder"),
 62: pg("L", "E-4 · Sub Work Place / BOM", "BOM Run → EBOM Run → Cost → Document · Drawing · Export",
        ["BOM 11행 · 섹션별 EBOM · 원가 · 문서 · 도면 · Export 가 전부 돈다", "EBOM·Cost 는 다시 계산하지 않고 **스냅샷을 읽는다**"], ["단가는 샘플", "'Work Process 의 설계·생산·자재 Data 추출' 은 배율 가정(18%·12%)"],
        "e2e S6a · S6b · S20a~S20c", "15_bom_cost"),
 63: pg("C", "간지", "Structure"),
 64: pg("P", "System Set-up 구조", "TLM Code Management · ERP Set-up",
        ["Sub Code · Product Code · Code relationship(BOM) Hierarchy ✓ · Approval management ✓", "3계층(플랫폼 → 회사 관리자 → 사용자) ✓"],
        ["Department Std. · Company DB(Customer·Supplier) · Warehouse · Inventory · Bank 없음"], "platform:test 25 · e2e S16 · S17", "40_company_admin"),
 65: pg("L", "EDIM RUN", "Work Process — 한 번의 Run 에서 나오는 것들",
        ["Main Code → BOM → 도면 · 원가 · Tech Data · PCR·견적 · 구매 요청, **모두 한 BOM 스냅샷**에서", "인쇄본 발치에 어느 BOM · 코드 개정 · 매크로 개정에서 나온 숫자인지 찍힌다"],
        ["Non-Standard Option(X Code) → R&D → New Code 흐름 없음", "Project 폴더 저장 구조 · ERP 승인 연결 없음(P6)"],
        "e2e S20a~S20d · S22b · S22c · S22f", "44_document_tab", "P6 통합"),
 66: pg("P", "D-3 · Pre-Calculation Report & Quotation", "PCR → Quotation",
        ["PCR(Material + Manufacturing = Direct Cost → Full cost) + 견적서 ✓", "견적 합계 = 스냅샷 원가 **그대로**(15,487,170 = 15,487,170)"],
        ["PCR 세부(Procurement · Sub-manufacturing · Sales & Adm. · EBIT) · Business Type 열 없음", "단가는 샘플 — 구조 시연이다"],
        "e2e S22a~S22f · document:test 28", "46_quotation_print", "회장님 몫: 회사 실 단가표"),
 67: pg("P", "D-4 · Product cost Management", "단가 관리 Table",
        ["단가가 코드 관계에 한 값으로 있고, 고치면 원가가 바뀐다"], ["견적 · 구매 이력 · 재고 단가 · 견적 적용 **Table 4종 없음**", "제조 정보(시간·임율·장비) 없음 · Supplier 없음"],
        "e2e S6b", "22_setup_relationship", "회사 실 단가표가 들어올 때 함께"),
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
<div class="kick">EDIM · 청사진 70장 대조 · 점검 초안</div>
<h1>70장 중<br><em>어디까지</em> 왔나</h1>
<p class="sub">청사진(EDIM.pdf) 70쪽을 한 장씩 실제 화면 옆에 놓았습니다. 도는 것은 도는 대로, 없는 것은 없는 대로 적었습니다.</p>
<div class="big4"><div class="b L"><i>{c["L"]}</i>실동</div><div class="b P"><i>{c["P"]}</i>부분</div><div class="b N"><i>{c["N"]}</i>미착수</div><div class="b C"><i>{c["C"]}</i>개념·표지</div></div>
<div class="meta">main {MAIN} · {DATE} · 판정은 엘의 것 — 회장님 조정 대상</div></div></section>'''

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
<div class="h hb"><b>실측 (main {MAIN} · 엘 샌드박스)</b><p>typecheck 11 · 단위 테스트 189 · 발표 시나리오 e2e <b>87/87</b><br>DB 검증: rls · revision · backbone 13 · platform 25 · drawing 14 · document 28 · auth<br>회귀: 슬롯 1,200 조합에서 BOM 불변<br>각 장의 근거 칸에 적힌 S번호는 <code>scripts/demo_e2e.py</code> 의 단계 이름이다.</p></div>
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
    return f'''<section class="slide"><div class="stage"><header><span class="no">끝</span><h2>남은 것 — 누가 풀어야 움직이나</h2></header>
<div class="honest">
<div class="h hc"><b>회장님 몫</b><p>① <b>Windows PC 에서 1회 실행</b> — 모든 수치가 그때 처음 회장님 것이 된다 (<code>docs/DEMO.md</code> §1, pull 후 <code>pnpm db:generate && pnpm db:migrate</code>)<br>② API 키로 Prompt→Macro 1회 · ③ 회사 실 표(단가 · Table1/NS)<br>④ 결정: 코드 개정에 슬롯 F 를 넣을지 · Arrangement(p13·35·36·46) 우선순위<br>⑤ DXF 추출 연구 결과(→ P3-b) · 88md 백업 · CI 워크플로 파일 1개 추가(토큰 권한 밖)</p></div>
<div class="h"><b>사장님 몫</b><p><b>D1</b> — Special Tool Box 첫 시연 사례(→ P3-c)<br>회사 기술 문서 · 기술 계산식(→ Tech Data 깊이, p15)</p></div>
<div class="h hb"><b>엘이 이어서 할 수 있는 것</b><p><b>P6 통합</b> — 프로젝트 승인 ↔ 코드 Rev · BOM 을 묶어 연결 장부 '없음' 3 → 2, 한 코드가 등록→승인까지 사람 재입력 없이<br>그 뒤 P5 발표(80% 완성 후 — 회장님 결정)</p></div>
<div class="h"><b>범위 밖으로 둔 것</b><p>p43·p44 생산·MES · p69 파트너·모바일·QR · 3D DWG · 클라우드 배포.<br>회장님 확정: EDIM 완료 후 확장 단계(ERP → Digital Twin → AR·XR).</p></div>
</div></div></section>'''

EXTRA_CSS = '''
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
    for theme, name in (("dark", "EDIM_청사진70장_대조_20260921.html"), ("light", "_print.html")):
        open(os.path.join(OUTDIR, name), "w", encoding="utf-8").write(build(theme))
    open(os.path.join(OUTDIR, "page-map.md"), "w", encoding="utf-8").write(page_map_md())
    c = counts(); print("pages 70 ·", " · ".join(f"{ST[k]} {c[k]}" for k in "LPNC"), "· slides", 70 + 5)
