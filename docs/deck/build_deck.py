#!/usr/bin/env python3
"""EDIM 발표 덱 생성기 (점검 초안 v0.2)
- 왼쪽: 청사진(EDIM.pdf 70장) 원본 페이지  /  오른쪽: 실동 화면(shots/*.png)
- shots 가 없으면 '주입 대기' 슬롯으로 렌더 → 토큰 확보 후 demo_e2e 산출물을 넣고 재빌드만 하면 됨
usage: python3 build_deck.py <corpus_dir> <shots_dir> <out.html>
"""
import base64, io, os, sys, html
from PIL import Image

CORPUS, SHOTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
THEME = sys.argv[4] if len(sys.argv) > 4 else "dark"

def b64img(path, maxw=1316, q=82):
    im = Image.open(path).convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, int(im.height * maxw / im.width)))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=q)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def bp(page):  # blueprint page image
    return b64img(os.path.join(CORPUS, f"{page}.jpeg"))

def shot(name):
    p = os.path.join(SHOTS, name) if name else None
    return b64img(p, maxw=1600, q=85) if p and os.path.exists(p) else None

# ── 매핑 슬라이드 데이터 ─────────────────────────────────────────────
# page: 청사진 쪽 / quote: 사이드카 원문 그대로 / screen: 실동 화면 제목 / facts: 실측 근거(지난 세션 lmd·e2e)
# shot: shots/ 파일명(토큰 후 확정) / say: 발표 한 줄
MAP = [
 dict(no="01", page=56, tag="E-1 · EDIM System Structure", title="작업대 — 다섯 구역",
      quote="Tool bar · Work Hierarchy · Main Work Place · Sub Work Place",
      screen="/workbench 5영역 실동", shot="workbench.png",
      facts=["Toolbar 3층 · Work Hierarchy · Work Place · Inspector · Action Bar", "Inspector가 프로젝트 PS-61313-5에 바인딩"],
      say="청사진의 화면 구조가 그대로 브라우저에 떠 있습니다."),
 dict(no="02", page=59, tag="E-3 · Key Work Place", title="Hierarchy와 Run 버튼",
      quote="EDIM Run · EBOM Run · EDIM BOM Running · Approval Request / Approved / Reject",
      screen="Work Hierarchy 트리 + Action Bar Run 4종", shot="hierarchy_actionbar.png",
      facts=["프로젝트 노드 선택 → 작업 대상 호출", "Run 4종 실동 (stub 0)"],
      say="p59의 심볼 목록이 실제 버튼입니다."),
 dict(no="03", page=61, tag="E-4 · Sub Work Place / Code", title="코드 조립 — A ▼ B ▼ C ▼ D ▼ E ▼ F ▼",
      quote="Code  A ▼  B ▼  C ▼  D ▼  E ▼  F ▼   ·   Product Code  EU - 3 – 2020 – 450 – 6 -21 -4 –SR - 7",
      screen="Code Builder — 슬롯 선택 → EU-55-2123-630SS VALID", shot="code_builder.png",
      facts=["A~F 슬롯 조립·검증은 순수 함수 (rccs 테스트 10건)", "문법 오류 코드는 서버가 422로 거부"],
      say="드롭다운 여섯 개가 코드 한 줄이 됩니다."),
 dict(no="04", page=24, tag="EDIM AI Tool · 도면 DB — 3. Revisions", title="개정 이력 — 새로고침해도 남는다",
      quote="rev_no 개정 번호 (A, B, C...) · rev_date 개정일 · rev_reason 개정 사유 · revised_by 개정자",
      screen="Save · Rev A → Rev B 적층, 이력 표", shot="revision.png",
      facts=["code_revision: append-only (앱 역할에 UPDATE/DELETE 권한 없음)", "테넌트 RLS 격리 · 감사 로그 — revision:test 8/8"],
      say="지우거나 고칠 수 없는 이력. 화면에서 새로고침해 보이겠습니다."),
 dict(no="05", page=27, tag="S-2-2 · EDIM Toolbox Macro", title="매크로 — 제안 → 검토 → 승인",
      quote="1) AI 방식으로 계산을 하도록 제안  2) 사용자 검토자  3) 승인",
      screen="매크로 탭 — Verify → 초안 → 승인 → revision 상승", shot="macro_approve.png",
      facts=["초안 게이트 = 정적 검증 + 런타임 dry-run (미지 코드참조 차단)", "승인된 매크로만 실행 대상"],
      say="틀린 규칙은 실행되기 전에 막힙니다."),
 dict(no="06", page=60, tag="E-4 · Sub Work Place / Coding", title="EDIM Run — 같은 입력, 같은 답",
      quote="Coding  =IF(MC,CC>500, Table12 (E,10:25,Cos2)+Var(FES,15,F3), …   Run",
      screen="EDIM Run → 455.4", shot="edim_run.png",
      facts=["런타임 LLM 호출 0 — AI는 번역까지만, 실행은 결정론", "Table1·NS 값은 샘플 (회사 표 대기)"],
      say="AI가 계산하지 않습니다. 승인된 식이 계산합니다."),
 dict(no="07", page=55, tag="System Set-Up · EDIM Approval Management", title="승인 — Design › Check › Approve › Accepted",
      quote="[EDIM Approval Management]  Status Approved, Pending   ·   p28·p42·p56 상단 — Design > Check > Approve > Accepted",
      screen="2계층 승인 파이프라인 (조직 · 플랫폼)", shot="approval.png",
      facts=["ProjectApproval 재사용 — 신규 스키마 0", "approval 테스트 8건"],
      say="청사진 모든 화면 상단의 그 네 단계입니다."),
 dict(no="08", page=62, tag="E-4 · Sub Work Place / BOM", title="BOM Run — 코드에서 하위 코드 전부",
      quote="“BOM Run“ > Product Main Code를 시작으로 Code Relationship으로 연결된 모든 하위 Code를 추출",
      screen="BOM 11행 · EBOM 6섹션", shot="bom.png",
      facts=["EBOM 소계 합 = 자재비 (테스트로 고정)", "방진구 사양은 매크로 결과값에서 파생"],
      say="코드 한 줄이 자재 목록 11행으로 펼쳐집니다."),
 dict(no="09", page=14, tag="공기조화기 사양", title="사양 — 우리 제품의 말로",
      quote="외판 칼라강판 0.8T · 보온재 G/Wool 48K 50T · FRAME Steel 1.6t Forming",
      screen="BOM 사양 열 = p14 사양표 그대로", shot="bom_spec.png",
      facts=["발명값 제거 → p14 원문 문자열, 테스트로 잠금 (테스트 147)"],
      say="BOM에 찍히는 글자는 이 사양표에서 왔습니다."),
 dict(no="10", page=65, tag="D-2 · EDIM RUN", title="도면 — Macro Run이 치수를 계산한다",
      quote="Manufacturing DWG Macro Run → Manufacturing DWG → Save (Project DWG folder)",
      screen="DXF R12 평면 배치도 다운로드", shot="dxf.png",
      facts=["독립 CAD 라이브러리(ezdxf) 파싱 OK — 레이어·치수 포함", "현재 평면 1장 (승인도·제작도는 다음 범위)"],
      say="그림 파일이 아니라 CAD가 여는 DXF입니다."),
 dict(no="11", page=66, tag="D-3 · Pre-Calculation Report & Quotation", title="원가 — Direct Cost",
      quote="Direct Cost · PCR (Table) · Quotation · Material Cost · Manufacturing Cost",
      screen="Cost 카드 — 자재 + 가공 + 간접", shot="cost.png",
      facts=["화면 값 = API 값 (e2e로 대조)", "단가·배율(18% / 12%)은 샘플 — 회사 표가 들어오면 교체"],
      say="구조는 닫혔고, 숫자는 회사 표를 기다립니다."),
]

# ── 커버리지(70장) — 섹션은 청사진 간지 페이지 기준 ────────────────
SECTIONS = [("System concept",2,9),("Product Selection",10,18),("System tool",19,28),("BOM Code Set-Up",29,36),
            ("Drawing Mgmt",37,44),("Selection & Document Set-Up",45,48),("User Set-Up",49,52),("Form",53,62),
            ("Structure",63,67),("Work Process · Biz Model",68,70)]
LIVE = {5,14,24,27,56,59,60,61,62,65}
PART = {10,13,22,28,55,66}

def esc(s): return html.escape(s, quote=False)

def slide_map(m):
    s = shot(m["shot"])
    right = (f'<img class="shot" src="{s}" alt="">' if s else
             f'<div class="slot"><div class="slot-k">실동 화면 · 주입 대기</div><div class="slot-f">shots/{esc(m["shot"])}</div>'
             f'<div class="slot-n">demo_e2e.py 산출 스크린샷이 이 자리에 들어갑니다</div></div>')
    facts = "".join(f"<li>{esc(f)}</li>" for f in m["facts"])
    return f'''<section class="slide map"><div class="stage">
  <header><span class="no">{m["no"]}</span><h2>{esc(m["title"])}</h2></header>
  <div class="pair">
    <figure class="bp"><div class="lab"><b>청사진</b> p{m["page"]} <i>{esc(m["tag"])}</i></div>
      <img src="{bp(m["page"])}" alt=""><blockquote>{esc(m["quote"])}</blockquote></figure>
    <div class="arrow">→</div>
    <figure class="live"><div class="lab"><b>실동</b> <i>{esc(m["screen"])}</i></div>{right}<ul>{facts}</ul></figure>
  </div>
  <footer>“{esc(m["say"])}”</footer></div></section>'''

def slide_cover():
    cells = []
    for name,a,b in SECTIONS:
        row = "".join(f'<span class="c {"live" if p in LIVE else "part" if p in PART else ""}">{p}</span>' for p in range(a,b+1))
        cells.append(f'<div class="sec"><div class="sn">{esc(name)}</div><div class="cs">{row}</div></div>')
    return f'''<section class="slide"><div class="stage">
  <header><span class="no">00</span><h2>70장 중 지금 움직이는 곳</h2></header>
  <div class="cov">{"".join(cells)}</div>
  <div class="legend"><span class="c live">n</span> 화면으로 실동 {len(LIVE)}장 <span class="c part">n</span> 일부 실동 {len(PART)}장 <span class="c">n</span> 청사진 단계</div>
  <footer>“넓게가 아니라 깊게 — 코드에서 BOM·도면·원가까지 한 줄기를 끝까지 뚫었습니다.”</footer></div></section>'''

def build():
    p5 = bp(5); p65 = bp(65)
    S = []
    S.append(f'''<section class="slide title"><div class="stage">
  <div class="kick">EDIM · CTO Business Platform — Beta</div>
  <h1>청사진이<br><em>움직입니다</em></h1>
  <p class="sub">코드 한 줄 → BOM · 도면 · 원가.&nbsp; 70장 설계도와 실제 화면을 나란히 놓고 보여드립니다.</p>
  <div class="meta">점검 초안 v0.2 · 2026-09-18</div></div></section>''')
    S.append(f'''<section class="slide full"><div class="stage">
  <header><span class="no">p5</span><h2>출발점 — 코드 한 줄이 회사를 관통한다</h2></header>
  <img class="hero" src="{p5}" alt="">
  <footer>“제품 선정 (Code 생성) → Part-List (Code 연결) → DWG (Code 정보기반 설계) → Product (Code QR)” <span class="src">— EDIM.pdf p5 원문</span></footer></div></section>''')
    S.append(slide_cover())
    S += [slide_map(m) for m in MAP]
    S.append(f'''<section class="slide full"><div class="stage">
  <header><span class="no">p65</span><h2>EDIM RUN 전체 흐름 — 어디까지 닫혔나</h2></header>
  <div class="runwrap"><img class="hero" src="{p65}" alt="">
  <div class="runlist"><div class="ok">● Selection → Main Code</div><div class="ok">● BOM & Part List</div><div class="ok">● Manufacturing DWG Macro Run <small>(평면 1장)</small></div>
  <div class="ok">● Material · Manufacturing · Direct Cost <small>(샘플 단가)</small></div><div class="no2">○ Approval drawing · Technical Data · PCR · Quotation · ERP 연계</div><div class="no2">○ Non-Standard Option (X Code) 프로세스</div></div></div>
  <footer>“왼쪽 끝에서 오른쪽 끝까지, 한 줄기는 실제로 이어져 있습니다.”</footer></div></section>''')
    S.append('''<section class="slide"><div class="stage">
  <header><span class="no">!!</span><h2>아직 아닌 것 — 먼저 말씀드립니다</h2></header>
  <div class="honest">
   <div class="h ha"><b>숫자</b><p>단가 · 원가 배율 · Table1/NS 값은 <u>샘플</u>입니다. 구조는 검증됐고, 회사 표가 들어오면 값만 교체됩니다.</p></div>
   <div class="h hb"><b>도면</b><p>평면 배치도 1장. 승인도 · 제작도 · 3D는 다음 범위입니다 (청사진 p17 · p36 · p62).</p></div>
   <div class="h hb"><b>범위</b><p>CPQ 문서 템플릿 · Print (p16–17 · p45–48), 단가 4테이블 (p67), ERP 구매 흐름 (p51–52)은 청사진 단계입니다.</p></div>
   <div class="h hc"><b>환경</b><p>검증은 개발 샌드박스 기준입니다. 시연 PC에서의 리허설 통과가 발표 준비 완료 시점입니다.</p></div>
  </div><footer>“된 것과 안 된 것의 경계를 저희가 먼저 긋겠습니다.”</footer></div></section>''')
    css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "deck.css")).read()
    if THEME == "light": css += open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "deck_light.css")).read()
    js = "addEventListener('keydown',e=>{const s=[...document.querySelectorAll('.slide')];const i=Math.round(scrollY/innerHeight);if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();s[Math.min(i+1,s.length-1)].scrollIntoView()}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();s[Math.max(i-1,0)].scrollIntoView()}})"
    doc = f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EDIM — 청사진이 움직입니다</title><style>{css}</style></head><body>{"".join(S)}<script>{js}</script></body></html>'
    open(OUT, "w", encoding="utf-8").write(doc)
    filled = sum(1 for m in MAP if shot(m["shot"]))
    print(f"slides={len(S)} map={len(MAP)} shots_filled={filled}/{len(MAP)} size={os.path.getsize(OUT)//1024}KB")

build()
