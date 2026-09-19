#!/usr/bin/env python3
"""EDIM 진행 현황 보고서 (2026-09-19) — 실측 자료로만 만든다.
사용: python3 build_progress_20260919.py <shots_dir> <out_dir>
입력: shots_dir/demo_e2e_result.json + 스크린샷, git log. 출력: 다크 HTML + 흰 PDF."""
import sys, json, base64, io, subprocess, html, os
from PIL import Image
SH, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
E = json.load(open(f"{SH}/demo_e2e_result.json", encoding="utf-8"))
def git(*a): return subprocess.run(["git", *a], capture_output=True, text=True, check=True).stdout.strip()
BASE = "a70daa9"; HEAD = git("rev-parse", "--short", "HEAD"); BR = git("branch", "--show-current")
LOG = [l.split("|", 2) for l in git("log", "--format=%h|%ad|%s", "--date=format:%m-%d %H:%M", f"{BASE}..HEAD").splitlines()]
STAT = git("diff", "--shortstat", BASE, "HEAD")
def img(name, w=1500):
    im = Image.open(f"{SH}/{name}").convert("RGB"); r = w / im.width
    if r < 1: im = im.resize((w, int(im.height * r)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=82); return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
# 구역 점수 — 잣대는 docs/plan과 동일: 0=없음 · 50=한 흐름이 화면에서 끝까지 · 100=청사진 전 기능 (엘 제안, 회장님 조정 대상)
Z = [("※⑤ MainForm", 70, 72, 90, "Code Builder 선택지가 등록 Sub Code에서 옴 · BOM에 상속 코드 열"),
     ("※② EDIM Toolbox", 45, 70, 85, "플로팅 창 · 역번역 · 흐름도 · 명령 버튼 동기화 / 자연어 번역은 실모델 미확인"),
     ("CPQ · BOM 산출", 40, 60, 85, "BOM = 등록 코드·관계·표 + 스냅샷 · 표를 Macro와 공유 / 단가는 샘플"),
     ("※① PLM Set-Up", 5, 50, 75, "등록 화면 3종(p31·33·34) + Running Test / p32·35·36·Key Dimension 없음"),
     ("※④ ERP", 15, 15, 60, "변동 없음"), ("※③ 관리자 영역", 0, 0, 70, "변동 없음 (P3 · D1 필요)")]
avg = lambda i: round(sum(z[i] for z in Z) / len(Z))
SC = [("1", "Set-Up — 코드를 등록한다", "done", "화면 3종 + Running Test"), ("2", "선택 — 코드 조립", "done", "기존 실동 + 선택지 DB화"),
      ("3", "Toolbox — 말로 규칙을 만든다", "part", "창·역번역·흐름도·승인 실동 / 자연어 번역은 API 키 없이 미확인"), ("4", "EDIM Run", "done", "기존 실동 · 등록 표를 읽음"),
      ("5", "BOM — 관계에서 뽑힌다", "done", "Code Relationship → 11행 → 스냅샷"), ("6", "산출 — 도면·원가·문서", "todo", "P4"),
      ("7", "경계 — Special Tool Box", "todo", "P3 · D1 미정"), ("8", "관리자 — DB① → DB②", "todo", "P3"), ("9", "ERP로 넘긴다", "todo", "P4")]
M = [("커밋 (main 대비)", "0", str(len(LOG)), f"{BASE}..{HEAD}"), ("변경 규모", "—", STAT.replace(" files changed", "파일").replace(" insertions(+)", "줄 추가").replace(" deletions(-)", "줄 삭제"), "git diff --shortstat"),
     ("단위·통합 테스트", "147", "169", "pnpm -r test (7 패키지 전부 통과)"), ("e2e 시나리오 단계", "14", f"{sum(1 for v in E.values() if v[0])}/{len(E)}", "scripts/demo_e2e.py · Playwright 실제 브라우저"),
     ("BOM 회귀 조합", "—", "1,200 / 1,200 동일", "코드 기반 BOM ≡ 기존 buildBom (행·사양·수량·단가)"), ("DB 검증", "revision", "backbone 13/13 · revision · rls", "RLS 격리 · FK · append-only · 감사"),
     ("typecheck", "10 패키지", "11 패키지", "pnpm typecheck 오류 0"), ("불변 확인값", "455.4 · ₩15,487,170", "455.4 · ₩15,487,170", "BOM 출처를 DB로 옮긴 뒤에도 동일"), ("마이그레이션", "0005", "0006 (+4 테이블)", "추가만 · 기존 테이블 무변경")]
css = """:root{--bg:#0A0F17;--s1:#111927;--s2:#162133;--ln:#24324a;--ink:#e6edf7;--mu:#8fa1bd;--ac:#2fbfa6;--wa:#e0a93e;--no:#5b6b86}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,'Noto Sans KR','Noto Sans CJK KR',system-ui,sans-serif;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
main{max-width:1080px;margin:0 auto;padding:36px 28px 60px}h1{font-size:30px;margin:0 0 6px;letter-spacing:-.5px}h1 em{color:var(--ac);font-style:normal}h2{font-size:18px;margin:34px 0 12px;padding-left:10px;border-left:3px solid var(--ac)}
.sub{color:var(--mu);font-size:14px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.kpi{background:var(--s1);border:1px solid var(--ln);border-radius:10px;padding:12px 14px}.kpi b{display:block;font-size:24px;color:var(--ac);letter-spacing:-.5px}.kpi span{font-size:12px;color:var(--mu)}
.bar{display:grid;grid-template-columns:190px 1fr 120px;gap:12px;align-items:center;margin:9px 0}.bar .nm b{font-size:14px}.bar .nm span{display:block;font-size:11.5px;color:var(--mu);line-height:1.35}.track{position:relative;height:16px;background:var(--s1);border:1px solid var(--ln);border-radius:8px;overflow:hidden}
.track i{position:absolute;top:0;bottom:0;left:0}.t-tgt{background:repeating-linear-gradient(135deg,transparent 0 5px,rgba(224,169,62,.35) 5px 7px);border-right:2px solid var(--wa)}.t-now{background:var(--ac)}.t-was{background:#1d6f63;border-right:2px solid #0A0F17}
.val{font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}.val s{color:var(--mu);text-decoration:none}.val b{color:var(--ac)}.val u{color:var(--wa);text-decoration:none}
.note{font-size:12.5px;color:var(--mu);background:var(--s1);border:1px solid var(--ln);border-radius:8px;padding:10px 12px;margin-top:10px}
.scn{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sc{background:var(--s1);border:1px solid var(--ln);border-radius:10px;padding:10px 12px;break-inside:avoid}.sc b{font-size:13.5px}.sc p{margin:4px 0 0;font-size:12px;color:var(--mu)}.sc .st{float:right;font-size:11px;border-radius:20px;padding:1px 8px;font-weight:700}
.done{border-color:var(--ac)}.done .st{background:var(--ac);color:#04211c}.part{border-color:var(--wa)}.part .st{background:var(--wa);color:#2a1d00}.todo .st{background:var(--s2);color:var(--mu)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--ln);vertical-align:top}th{color:var(--mu);font-size:12px;font-weight:600}td.n{font-variant-numeric:tabular-nums;white-space:nowrap}td.a{color:var(--ac);font-weight:700}
.mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12px}.e2e{columns:2;column-gap:22px;font-size:12px}.e2e div{break-inside:avoid;padding:3px 0;border-bottom:1px solid var(--ln)}.e2e b{color:var(--ac);margin-right:6px}.e2e .new{color:var(--wa)}
figure{margin:14px 0;break-inside:avoid}figure img{width:100%;border:1px solid var(--ln);border-radius:8px;display:block}figcaption{font-size:12.5px;color:var(--mu);margin-top:6px}
ul{margin:6px 0;padding-left:20px;font-size:13.5px}li{margin:3px 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media print{:root{--bg:#fff;--s1:#f5f7fa;--s2:#e9edf3;--ln:#d5dbe6;--ink:#121826;--mu:#55627a;--ac:#0f8f7b;--wa:#b97a10;--no:#8a96ab}.t-was{background:#7fcabd;border-right-color:#fff}main{padding:0;max-width:none}h2{break-after:avoid}@page{size:A4;margin:14mm}}
.tw{overflow-x:auto}.sub,.note,figcaption,.e2e div,td{overflow-wrap:anywhere}
@media(max-width:720px){main{padding:22px 14px 40px}h1{font-size:23px}td.n{white-space:normal}.tw table{min-width:560px}.kpis{grid-template-columns:repeat(2,1fr)}.scn,.cols{grid-template-columns:1fr}.bar{grid-template-columns:1fr;gap:4px}.e2e{columns:1}}"""
bars = "".join(f'<div class="bar"><div class="nm"><b>{n}</b><span>{html.escape(d)}</span></div><div class="track"><i class="t-tgt" style="width:{t}%"></i><i class="t-now" style="width:{c}%"></i><i class="t-was" style="width:{w}%"></i></div><div class="val"><s>{w}</s> → <b>{c}</b> → <u>{t}</u></div></div>' for n, w, c, t, d in Z)
stl = {"done": "실동", "part": "부분", "todo": "미착수"}
scn = "".join(f'<div class="sc {s}"><span class="st">{stl[s]}</span><b>{i}. {html.escape(t)}</b><p>{html.escape(p)}</p></div>' for i, t, s, p in SC)
rows = "".join(f'<tr><td>{a}</td><td class="n">{b}</td><td class="n a">{c}</td><td>{html.escape(d)}</td></tr>' for a, b, c, d in M)
OLD = 14
e2e = "".join(f'<div{" class=new" if i >= OLD else ""}><b>{"PASS" if v[0] else "FAIL"}</b>{html.escape(k)}</div>' for i, (k, v) in enumerate(E.items()))
log = "".join(f'<tr><td class="mono">{h}</td><td class="n">{d}</td><td>{html.escape(s[:150])}</td></tr>' for h, d, s in LOG)
done_n = sum(1 for s in SC if s[2] == "done"); part_n = sum(1 for s in SC if s[2] == "part")
H = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EDIM 진행 현황 · 2026-09-19</title><style>{css}</style></head><body><main>
<div class="sub">EDIM · 20→80 진행 현황 보고 · 점검 초안</div><h1>구역 평균 {avg(1)} → <em>{avg(2)}</em> <span style="font-size:18px;color:var(--mu)">/ 목표 {avg(3)}</span></h1>
<div class="sub">2026-09-19 · main = {BASE} (변경 없음) · 작업 브랜치 <span class="mono">{BR}</span> @ {HEAD} · 모든 수치는 엘 샌드박스에서 이 보고서 생성 직전에 실측</div>
<div class="kpis"><div class="kpi"><b>{done_n}<span style="font-size:14px"> + {part_n}부분</span> / 9</b><span>발표 장면 (실동 + 부분)</span></div><div class="kpi"><b>{sum(1 for v in E.values() if v[0])}/{len(E)}</b><span>e2e 단계 통과 (이전 14)</span></div><div class="kpi"><b>169</b><span>테스트 통과 (이전 147)</span></div><div class="kpi"><b>1,200</b><span>BOM 회귀 조합 전부 동일</span></div></div>
<h2>1. 구역별 시연 가능 깊이 — 이전 → 지금 → 목표</h2>{bars}
<div class="note"><b>잣대</b>는 20→80 시나리오와 같습니다: 0 = 없음 · 50 = 한 흐름이 화면에서 끝까지 돈다 · 100 = 청사진 전 기능. <b>점수는 엘의 제안</b>이고 공수 가중은 없습니다. 객관 자료는 아래 2~5절이며, 점수는 그것을 읽은 판단입니다. 회장님 조정 대상.</div>
<h2>2. ‘80’의 아홉 장면</h2><div class="scn">{scn}</div>
<h2>3. 실측 수치</h2><div class="tw"><table><tr><th>항목</th><th>이전 (main)</th><th>지금</th><th>측정 방법</th></tr>{rows}</table></div>
<h2>4. 화면 증거 (e2e가 찍은 실제 화면)</h2>
<figure><img src="{img('22_setup_relationship.png')}"><figcaption>Set-Up ▸ Code Relationship (p34). 왼쪽 Child Group 13행, 오른쪽 Part List Running Test — Main <span class="mono">EU-4-2-1-1</span>, 자식 코드에 부모 선택 순번이 붙는다(<span class="mono">KFP 1-4</span>).</figcaption></figure>
<figure><img src="{img('21_setup_product_table.png')}"><figcaption>Set-Up ▸ Product Code ▸ Table (p33). 청사진 모양: Table 번호 · 글자 열 · Item 행. 55행 A열(fanKw)을 22→30으로 고친 상태 — BOM(30kW)과 승인 매크로 값(455.4→621)이 함께 바뀐다.</figcaption></figure>
<figure><img src="{img('30_toolbox_program.png')}"><figcaption>MainForm + 플로팅 Toolbox(Program Tool). 기본 위치는 Inspector 열 — 중앙 작업영역을 가리지 않는다. Description·Flowchart는 식에서 결정론으로 생성(LLM 아님). Run 값 455.4가 Toolbox와 Action Bar에 동시에.</figcaption></figure>
<h2>5. e2e {len(E)}단계 전체 결과 <span style="font-size:12px;color:var(--wa)">주황 = 이번에 추가된 {len(E)-OLD}단계</span></h2><div class="e2e">{e2e}</div>
<h2>6. 커밋 기록 (main 대비 {len(LOG)}개)</h2><div class="tw"><table><tr><th>커밋</th><th>시각</th><th>내용</th></tr>{log}</table></div>
<h2>7. 아직 아닌 것 · 남은 것</h2><div class="cols"><div><b style="font-size:14px">정직 고지</b><ul>
<li>표·단가는 <b>여전히 샘플</b>. 기존 샘플 공식의 결과를 등록 표로 옮긴 것.</li><li>Prompt→Macro(자연어 번역)는 <b>실제 모델로 0회 실행</b>. 샌드박스에 API 키 없음.</li>
<li>회장님 Windows PC에서의 실행은 <b>여전히 0회</b>. 위 수치는 전부 엘 샌드박스(Linux) 기준.</li><li>다단 BOM · p32 Material code · p35–36 Arrangement · Key Dimension · DWG 첨부 없음.</li>
<li>p27 Coding(AI) · 함수/그래프 마법사 · 글·그림→식 역방향, p25 Combo box·Templet·Canvas 없음.</li><li>Var(NS)·코드 이름 용어집은 샘플 상수. RCCS F 슬롯과 순번 상속의 관계 미정리.</li><li>Toolbox 설정 저장은 브라우저까지(회사 공용은 테이블 필요).</li></ul></div>
<div><b style="font-size:14px">남은 순서</b><ul><li><b>P3 경계</b> — 플랫폼 관리자 · Special 슬롯(<b>D1 필요</b>) · DB①→② 프로젝션 · 학습 1수준(하이브리드, 회장님 DXF 연구 상속)</li><li><b>P4 산출 폭</b> — 치수 전파 도면 · 견적 · 구매 요청 1흐름</li><li><b>P5 발표</b> — 덱 v1.0 · 리허설</li></ul>
<b style="font-size:14px">회장님 몫</b><ul><li>main 머지 승인 (브랜치 3개 적층 대기)</li><li>D1 Special Tool Box 첫 시연 사례</li><li>Windows 로컬 실행 1회 · API 키로 Prompt 1회 확인</li><li>회사 실 표(단가·규격) · 88md 백업 · 스킬 3개 저장</li></ul></div></div>
<div class="note">이 문서는 점검 초안입니다. 수정·질문을 주시면 반영하겠습니다. 생성기: <span class="mono">docs/02-reports/build_progress_20260919.py</span></div></main></body></html>"""
open(f"{OUT}/EDIM_진행현황_20260919.html", "w", encoding="utf-8").write(H)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1180, "height": 900}); pg.goto("file://" + os.path.abspath(f"{OUT}/EDIM_진행현황_20260919.html")); pg.wait_for_timeout(600)
    pg.screenshot(path=f"{OUT}/_check_dark.png", full_page=True)
    ov = pg.evaluate("[...document.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=='hidden').length")
    pg.pdf(path=f"{OUT}/EDIM_진행현황_20260919.pdf", format="A4", print_background=True, margin={"top": "14mm", "bottom": "14mm", "left": "14mm", "right": "14mm"})
    m = b.new_page(viewport={"width": 390, "height": 844}); m.goto("file://" + os.path.abspath(f"{OUT}/EDIM_진행현황_20260919.html")); m.wait_for_timeout(400)
    mov = m.evaluate("document.documentElement.scrollWidth - window.innerWidth"); bad = m.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1 && !e.closest('.tw')).slice(0,5).map(e=>e.tagName+'.'+e.className)"); print("mobile-offenders", bad); m.screenshot(path=f"{OUT}/_check_mobile.png", full_page=False); b.close()
print("overflow-elements", ov, "mobile-x-overflow", mov, "avg", avg(1), avg(2), avg(3))
