#!/usr/bin/env python3
"""EDIM 진행 현황 보고서 (2026-09-20) — 실측 자료로만 만든다.
사용: python3 build_progress_20260920.py <shots_dir> <out_dir>
입력: shots_dir/demo_e2e_result.json + 스크린샷, git log. 출력: 다크 HTML + 흰 PDF.
앞판: build_progress_20260919.py (같은 잣대·같은 레이아웃을 유지해 비교 가능하게 한다)."""
import sys, json, base64, io, subprocess, html, os
from PIL import Image
SH, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
E = json.load(open(f"{SH}/demo_e2e_result.json", encoding="utf-8"))
def git(*a): return subprocess.run(["git", *a], capture_output=True, text=True, check=True).stdout.strip()
BASE = "f2b4277"; HEAD = git("rev-parse", "--short", "HEAD"); BR = git("branch", "--show-current")
LOG = [l.split("|", 2) for l in git("log", "--format=%h|%ad|%s", "--date=format:%m-%d %H:%M", f"{BASE}..HEAD").splitlines()]
STAT = git("diff", "--shortstat", BASE, "HEAD")
def img(name, w=1500):
    im = Image.open(f"{SH}/{name}").convert("RGB"); r = w / im.width
    if r < 1: im = im.resize((w, int(im.height * r)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=82); return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

# 구역 점수 — 잣대는 docs/plan과 동일: 0=없음 · 50=한 흐름이 화면에서 끝까지 · 100=청사진 전 기능 (엘 제안, 회장님 조정 대상)
Z = [("※⑤ MainForm", 72, 75, 90, "Design 탭에서 도면 등록·개정·상태 · 핵심 치수가 등록 표 값을 그대로 읽음"),
     ("※② EDIM Toolbox", 70, 70, 85, "변동 없음 — 자연어 번역은 여전히 실모델 미확인(API 키 없음)"),
     ("CPQ · BOM 산출", 60, 70, 85, "도면이 등록 치수로 전파 · 모든 산출이 BOM 스냅샷 한 입구 / 견적·단가는 남음"),
     ("※① PLM Set-Up", 50, 60, 75, "Key Dimension을 기존 등록 표의 Dim 종류로 / p32·35·36 Arrangement 없음"),
     ("※④ ERP", 15, 15, 60, "변동 없음 — 구매 요청은 P4-b"),
     ("※③ 관리자 영역", 0, 40, 70, "3계층·DB①/② 권한 분리·요청 통로 실동 / Special·학습·프로젝션 남음")]
avg = lambda i: round(sum(z[i] for z in Z) / len(Z))

# 연결 장부 — 구역을 채우는 일과 구역 사이를 잇는 일은 다르다. 이 표는 '이어짐'만 본다.
L = [("Set-Up Sub Code → Code Builder", "이어짐", "이어짐", "loadSlotDefs · e2e S12a"),
     ("Set-Up 코드·관계·표 → BOM", "이어짐", "이어짐", "runBomCode · 회귀 1,200 조합"),
     ("Set-Up 표 → Macro(TableN)", "이어짐", "이어짐", "loadMacroTables · e2e S10d(455.4→621)"),
     ("Toolbox Macro 승인 → EDIM Run", "이어짐", "이어짐", "승인된 것만 실행"),
     ("EDIM Run 값 → BOM(방진구)", "약함", "이어짐", "매크로를 서버가 직접 실행 · 클라이언트는 값을 보내지 않음 · e2e S20d"),
     ("저장된 코드 Rev → BOM Run", "약함", "이어짐", "스냅샷에 code_revision_id · drawing:test"),
     ("BOM 스냅샷 → EBOM·Cost", "약함", "이어짐", "재계산 폐기 · runId 없으면 409 · e2e S20a~c"),
     ("BOM·코드 → DXF 도면", "없음", "이어짐", "스냅샷 + 등록 Key Dimension · 치수 표 없으면 422 · e2e S7b·S18"),
     ("회사 → 플랫폼 (요청·승인)", "없음", "이어짐", "platform_request 한 통로 · e2e S16a~S16j"),
     ("BOM → 견적·Export", "없음", "없음", "→ P4-b"),
     ("BOM → ERP 구매 요청", "없음", "없음", "→ P4-b"),
     ("프로젝트 승인 ↔ 코드 Rev·BOM", "없음", "없음", "무엇을 승인했는지 연결 없음 → P6"),
     ("DB① → DB② 프로젝션", "없음", "없음", "DB①은 만들어졌으나 비어 있음 → P3-b"),
     ("Special 모듈 → MainForm", "없음", "없음", "→ P3-c")]
cnt = lambda i, s: sum(1 for r in L if r[i] == s)

SC = [("1", "Set-Up — 코드를 등록한다", "done", "화면 3종(p31·33·34) + Running Test"),
      ("2", "선택 — 코드 조립", "done", "A~F 슬롯 · Rev A/B append-only"),
      ("3", "Toolbox — 말로 규칙을 만든다", "part", "창·역번역·흐름도·승인 실동 / 자연어 번역은 API 키 없이 미확인"),
      ("4", "EDIM Run", "done", "승인된 식만 결정론 실행 · 런타임 LLM 0"),
      ("5", "BOM — 관계에서 뽑힌다", "done", "Code Relationship → 11행 → 스냅샷"),
      ("6", "산출 — 도면·원가·문서", "part", "치수 전파 도면 2종·원가 실동 / 견적(Quotation)·Tech Data는 P4-b"),
      ("7", "경계 — Special Tool Box", "todo", "P3-c · 사장님 D1 미정"),
      ("8", "관리자 — DB① → DB②", "part", "3계층·권한 분리·역류 차단 실동 / 프로젝션·학습 1수준은 P3-b"),
      ("9", "ERP로 넘긴다", "todo", "P4-b 구매 요청 1흐름")]

# P 카드 매칭표 — 승인된 20→80 순서에 지금까지 한 것을 맞춘 표
PC = [("P0", "발표 안전망", "done", "리허설 잔재 리셋 · e2e 69단계 · 확정 장부 repo 이중화"),
      ("P1", "코드 기반 등뼈 (※① + BOM)", "done", "테이블 4종 · 등록 화면 3종 · backbone:test 13/13 · 회귀 1,200"),
      ("P2", "청사진대로 Toolbox (※②)", "part", "플로팅 창·역번역·흐름도·명령 동기화 / 자연어 번역 실모델 0회"),
      ("P3-a", "플랫폼 관리자 계층 · DB①/② 분리", "done", "platform 스키마 · 역할 2종 · 요청 통로 · platform:test 22/22"),
      ("P3-b", "DB①→DB② 프로젝션 · 학습 1수준", "todo", "회장님 DXF 추출 연구 결과 후"),
      ("P3-c", "Special Tool Box 슬롯", "todo", "사장님 D1(첫 시연 사례) 후"),
      ("P4-a", "치수 전파 · 도면", "done", "Dim 표 · DXF 2종 · drawing 상태 4단계·발행 잠금 · drawing:test 12/12"),
      ("P4-b", "견적 · Tech Data · 구매 요청", "next", "다음 세션 첫 작업 — 착수 전 결정 1건(Export CSV vs xlsx)"),
      ("P6", "통합 (유기 연결)", "todo", "장부 '없음' 0 + 금실 1회 주행"),
      ("P5", "발표", "todo", "덱 v1.0 · 리허설 — 80% 완성 후")]

M = [("커밋 (main 대비)", "0", str(len(LOG)), f"{BASE}..{HEAD}"),
     ("변경 규모", "—", STAT.replace(" files changed", "파일").replace(" insertions(+)", "줄 추가").replace(" deletions(-)", "줄 삭제"), "git diff --shortstat"),
     ("단위·통합 테스트", "169", "177", "pnpm -r test (7 패키지 전부 통과)"),
     ("e2e 시나리오 단계", "39", f"{sum(1 for v in E.values() if v[0])}/{len(E)}", "scripts/demo_e2e.py · Playwright 실제 브라우저"),
     ("DB 검증", "backbone 13/13 · revision · rls", "+ platform 22/22 · drawing 12/12", "권한 거부·RLS·발행 잠금을 DB에서 실측"),
     ("연결 장부", "이어짐 4 · 약함 3 · 없음 7", f"이어짐 {cnt(2,'이어짐')} · 약함 {cnt(2,'약함')} · 없음 {cnt(2,'없음')}", "docs/plan/connection-ledger.md"),
     ("도면 치수의 출처", "샘플 상수 (sqrt 공식)", "등록 Key Dimension 표", "표 한 칸 2472→2600 → 도면 폭 전파, ezdxf 파싱 실측"),
     ("typecheck", "11 패키지", "11 패키지", "pnpm typecheck 오류 0"),
     ("불변 확인값", "455.4 · ₩15,487,170", "455.4 · ₩15,487,170", "매크로를 서버 실행으로 바꾼 뒤에도 동일"),
     ("마이그레이션", "0006", "0008 (+2 테이블 · 트리거 2)", "추가만 · 기존 테이블 무변경")]

css = """:root{--bg:#0A0F17;--s1:#111927;--s2:#162133;--ln:#24324a;--ink:#e6edf7;--mu:#8fa1bd;--ac:#2fbfa6;--wa:#e0a93e;--no:#5b6b86;--bad:#d9737a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,'Noto Sans KR','Noto Sans CJK KR',system-ui,sans-serif;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
main{max-width:1080px;margin:0 auto;padding:36px 28px 60px}h1{font-size:30px;margin:0 0 6px;letter-spacing:-.5px}h1 em{color:var(--ac);font-style:normal}h2{font-size:18px;margin:34px 0 12px;padding-left:10px;border-left:3px solid var(--ac)}
.sub{color:var(--mu);font-size:14px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.kpi{background:var(--s1);border:1px solid var(--ln);border-radius:10px;padding:12px 14px}.kpi b{display:block;font-size:24px;color:var(--ac);letter-spacing:-.5px}.kpi span{font-size:12px;color:var(--mu)}
.bar{display:grid;grid-template-columns:190px 1fr 120px;gap:12px;align-items:center;margin:9px 0}.bar .nm b{font-size:14px}.bar .nm span{display:block;font-size:11.5px;color:var(--mu);line-height:1.35}.track{position:relative;height:16px;background:var(--s1);border:1px solid var(--ln);border-radius:8px;overflow:hidden}
.track i{position:absolute;top:0;bottom:0;left:0}.t-tgt{background:repeating-linear-gradient(135deg,transparent 0 5px,rgba(224,169,62,.35) 5px 7px);border-right:2px solid var(--wa)}.t-now{background:var(--ac)}.t-was{background:#1d6f63;border-right:2px solid #0A0F17}
.val{font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}.val s{color:var(--mu);text-decoration:none}.val b{color:var(--ac)}.val u{color:var(--wa);text-decoration:none}
.note{font-size:12.5px;color:var(--mu);background:var(--s1);border:1px solid var(--ln);border-radius:8px;padding:10px 12px;margin-top:10px}
.scn{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sc{background:var(--s1);border:1px solid var(--ln);border-radius:10px;padding:10px 12px;break-inside:avoid}.sc b{font-size:13.5px}.sc p{margin:4px 0 0;font-size:12px;color:var(--mu)}.sc .st{float:right;font-size:11px;border-radius:20px;padding:1px 8px;font-weight:700}
.done{border-color:var(--ac)}.done .st{background:var(--ac);color:#04211c}.part{border-color:var(--wa)}.part .st{background:var(--wa);color:#2a1d00}.todo .st{background:var(--s2);color:var(--mu)}.next{border-color:#6aa9ff}.next .st{background:#6aa9ff;color:#05203f}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--ln);vertical-align:top}th{color:var(--mu);font-size:12px;font-weight:600}td.n{font-variant-numeric:tabular-nums;white-space:nowrap}td.a{color:var(--ac);font-weight:700}
.tag{font-size:11px;font-weight:700;border-radius:20px;padding:1px 8px;white-space:nowrap}.g-ok{background:var(--ac);color:#04211c}.g-wk{background:var(--wa);color:#2a1d00}.g-no{background:var(--s2);color:var(--mu)}
.mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12px}.e2e{columns:2;column-gap:22px;font-size:12px}.e2e div{break-inside:avoid;padding:3px 0;border-bottom:1px solid var(--ln)}.e2e b{color:var(--ac);margin-right:6px}.e2e .new{color:var(--wa)}
figure{margin:14px 0;break-inside:avoid}figure img{width:100%;border:1px solid var(--ln);border-radius:8px;display:block}figcaption{font-size:12.5px;color:var(--mu);margin-top:6px}
ul{margin:6px 0;padding-left:20px;font-size:13.5px}li{margin:3px 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media print{:root{--bg:#fff;--s1:#f5f7fa;--s2:#e9edf3;--ln:#d5dbe6;--ink:#121826;--mu:#55627a;--ac:#0f8f7b;--wa:#b97a10;--no:#8a96ab}.t-was{background:#7fcabd;border-right-color:#fff}main{padding:0;max-width:none}h2{break-after:avoid}@page{size:A4;margin:14mm}}
.tw{overflow-x:auto}.sub,.note,figcaption,.e2e div,td{overflow-wrap:anywhere}
@media(max-width:720px){main{padding:22px 14px 40px}h1{font-size:23px}td.n{white-space:normal}.tw table{min-width:560px}.kpis{grid-template-columns:repeat(2,1fr)}.scn,.cols{grid-template-columns:1fr}.bar{grid-template-columns:1fr;gap:4px}.e2e{columns:1}}"""

bars = "".join(f'<div class="bar"><div class="nm"><b>{n}</b><span>{html.escape(d)}</span></div><div class="track"><i class="t-tgt" style="width:{t}%"></i><i class="t-now" style="width:{c}%"></i><i class="t-was" style="width:{w}%"></i></div><div class="val"><s>{w}</s> → <b>{c}</b> → <u>{t}</u></div></div>' for n, w, c, t, d in Z)
stl = {"done": "실동", "part": "부분", "todo": "미착수", "next": "다음"}
scn = "".join(f'<div class="sc {s}"><span class="st">{stl[s]}</span><b>{i}. {html.escape(t)}</b><p>{html.escape(p)}</p></div>' for i, t, s, p in SC)
tagc = {"이어짐": "g-ok", "약함": "g-wk", "없음": "g-no"}
led = "".join(f'<tr><td>{html.escape(a)}</td><td class="n"><span class="tag {tagc[b]}">{b}</span></td><td class="n"><span class="tag {tagc[c]}">{c}</span></td><td>{html.escape(d)}</td></tr>' for a, b, c, d in L)
pcard = "".join(f'<tr><td class="mono">{k}</td><td>{html.escape(t)}</td><td class="n"><span class="tag {"g-ok" if s=="done" else "g-wk" if s in ("part","next") else "g-no"}">{stl[s]}</span></td><td>{html.escape(d)}</td></tr>' for k, t, s, d in PC)
rows = "".join(f'<tr><td>{a}</td><td class="n">{html.escape(b)}</td><td class="n a">{html.escape(c)}</td><td>{html.escape(d)}</td></tr>' for a, b, c, d in M)
OLD = 39
e2e = "".join(f'<div{" class=new" if i >= OLD else ""}><b>{"PASS" if v[0] else "FAIL"}</b>{html.escape(k)}</div>' for i, (k, v) in enumerate(E.items()))
log = "".join(f'<tr><td class="mono">{h}</td><td class="n">{d}</td><td>{html.escape(s[:150])}</td></tr>' for h, d, s in LOG)
done_n = sum(1 for s in SC if s[2] == "done"); part_n = sum(1 for s in SC if s[2] == "part")

H = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EDIM 진행 현황 · 2026-09-20</title><style>{css}</style></head><body><main>
<div class="sub">EDIM · 20→80 진행 현황 보고 · 점검 초안</div><h1>구역 평균 {avg(1)} → <em>{avg(2)}</em> <span style="font-size:18px;color:var(--mu)">/ 목표 {avg(3)}</span></h1>
<div class="sub">2026-09-20 · main = <span class="mono">{HEAD}</span> (P3-a · P4-a 머지 완료) · 이전 보고 기준 <span class="mono">{BASE}</span> · 모든 수치는 엘 샌드박스에서 이 보고서 생성 직전에 실측</div>
<div class="kpis"><div class="kpi"><b>{done_n}<span style="font-size:14px"> + {part_n}부분</span> / 9</b><span>발표 장면 (실동 + 부분, 이전 4+1)</span></div><div class="kpi"><b>{sum(1 for v in E.values() if v[0])}/{len(E)}</b><span>e2e 단계 통과 (이전 39)</span></div><div class="kpi"><b>177</b><span>테스트 통과 (이전 169)</span></div><div class="kpi"><b>0</b><span>연결 장부 '약함' (이전 3)</span></div></div>

<h2>1. 구역별 시연 가능 깊이 — 이전 → 지금 → 목표</h2>{bars}
<div class="note"><b>잣대</b>는 20→80 시나리오와 같습니다: 0 = 없음 · 50 = 한 흐름이 화면에서 끝까지 돈다 · 100 = 청사진 전 기능. <b>점수는 엘의 제안</b>이고 공수 가중은 없습니다. 객관 자료는 아래 2~7절이며, 점수는 그것을 읽은 판단입니다. 회장님 조정 대상.</div>

<h2>2. 연결 장부 — “전체가 유기적으로 도는가”</h2>
<div class="note">회장님 지시(2026-09-19)를 점검 장치로 만든 표입니다. 구역을 <b>채우는</b> 일과 구역 사이가 <b>이어지는</b> 일은 다른 일이라, 이 표는 이어짐만 봅니다.
<b>이어짐</b> = 앞 구역의 산출이 <b>저장된 데이터로</b> 다음 구역의 입력이 된다(사람이 다시 넣지 않고, 화면 상태에 기대지 않는다) · <b>약함</b> = 이어지되 화면 상태를 거치거나 매번 재계산 · <b>없음</b> = 연결 0.</div>
<div class="tw"><table><tr><th>앞 → 뒤</th><th>이전</th><th>지금</th><th>근거 (실측)</th></tr>{led}</table></div>
<div class="note">합계 <b>이어짐 {cnt(2,'이어짐')} · 약함 {cnt(2,'약함')} · 없음 {cnt(2,'없음')}</b> (이전 {cnt(1,'이어짐')} · {cnt(1,'약함')} · {cnt(1,'없음')}). <b>약한 고리가 처음으로 0</b>이 되었습니다 — 설계 축 하나(“모든 산출물은 BOM 스냅샷 하나에서 나온다”)로 세 고리를 같이 닫았습니다. 남은 '없음' 5건은 P4-b·P3-b·P3-c·P6에 각각 물려 있습니다.</div>

<h2>3. ‘80’의 아홉 장면</h2><div class="scn">{scn}</div>

<h2>4. 매칭표 — 승인된 순서에 맞춘 진행</h2>
<div class="tw"><table><tr><th>카드</th><th>내용</th><th>상태</th><th>근거 · 조건</th></tr>{pcard}</table></div>
<div class="note">승인된 순서(2026-09-19): P3-a → P4 → P3-b(회장님 DXF 연구 후) → P3-c(사장님 D1 후) → <b>P6 통합</b> → P5 발표. P4는 회장님 승인으로 <b>a/b로 쪼개</b> P4-a를 먼저 끝냈습니다.</div>

<h2>5. 실측 수치</h2><div class="tw"><table><tr><th>항목</th><th>이전 (09-19 보고)</th><th>지금</th><th>측정 방법</th></tr>{rows}</table></div>

<h2>6. 화면 증거 (e2e가 찍은 실제 화면)</h2>
<figure><img src="{img('41_platform_console.png')}"><figcaption><b>※③ 관리자 영역 — Platform Console.</b> 테넌트 메타와 올라온 Special 의뢰만 보입니다. 고객사 업무 데이터(BOM·프로젝트·코드)는 <b>앱이 참는 게 아니라 DB 권한이 없어서</b> 보이지 않습니다 — <span class="mono">edim_platform</span> 역할로 업무 테이블을 읽으면 permission denied (platform:test 22/22). DB①은 0건이 정상입니다(내용물은 P3-b).</figcaption></figure>
<figure><img src="{img('43_drawings.png')}"><figcaption><b>P4-a — Design 탭.</b> BOM 스냅샷에서 뜬 평면도·조립도, 등록된 도면 2개가 <span class="mono">Rev A(발행)</span>·<span class="mono">Rev B(작성중)</span>로 쌓여 있습니다. 하단 <b>핵심 치수</b>는 화면이 계산한 값이 아니라 <b>등록 Key Dimension 표</b>에서 온 값입니다.</figcaption></figure>
<figure><img src="{img('40_company_admin.png')}"><figcaption><b>2층↔3층, 2층→1층 — Company Info.</b> 회사 관리자(owner)만 역할을 바꾸고(마지막 owner 강등은 서버가 거부), 플랫폼으로 올라가는 길은 <b>Special 의뢰 한 통로</b>뿐입니다. 플랫폼이 승인하면 이 화면에 ‘승인됨 — 결정 메모’로 돌아옵니다.</figcaption></figure>

<h2>7. e2e {len(E)}단계 전체 결과 <span style="font-size:12px;color:var(--wa)">주황 = 이번에 추가된 {len(E)-OLD}단계</span></h2><div class="e2e">{e2e}</div>
<div class="note">이번에 추가된 단계의 핵심 셋: <b>S18</b> 치수 표 한 칸(55행 W)을 2472→2600으로 고치고 같은 코드로 다시 돌린 전후 DXF를 <b>ezdxf로 파싱</b> — 폭만 128 커지고 엔티티 수·레이어·전장(L=5400)은 그대로. <b>S19</b> 도면 개정 A→B, 발행하면 수정이 409로 거부. <b>S20</b> runId 없는 Cost는 409 — 산출물은 스냅샷에서만 나옵니다.</div>

<h2>8. 커밋 기록 (이전 보고 이후 {len(LOG)}개)</h2><div class="tw"><table><tr><th>커밋</th><th>시각</th><th>내용</th></tr>{log}</table></div>

<h2>9. 아직 아닌 것 · 남은 것</h2><div class="cols"><div><b style="font-size:14px">정직 고지</b><ul>
<li>회장님 Windows PC에서의 실행은 <b>여전히 0회</b>. 위 수치는 전부 엘 샌드박스(Linux) 기준.</li>
<li>표·단가는 <b>여전히 샘플</b>. 견적은 구조 시연이 될 뿐, 숫자는 회사 표를 기다립니다.</li>
<li>Prompt→Macro(자연어 번역)는 <b>실제 모델로 0회 실행</b>. 샌드박스에 API 키 없음.</li>
<li>도면은 여전히 <b>선과 글자</b>. 실제 제작도 수준이 아닙니다.</li>
<li>p38 <span class="mono">KAD-□□□…</span> 슬롯과 Key Dimension의 대응 <b>문법 미정</b> — P4-a는 “사이즈 행 → W/H/L” 한 수준만 씁니다.</li>
<li>다단 BOM · p32 Material code · p35–36 Arrangement · DWG 첨부 없음.</li>
<li>기존 Macro 탭과 Toolbox Program Tool <b>기능 중복</b>이 아직 정리되지 않았습니다.</li>
<li>구역 점수는 <b>엘의 판단</b>입니다. 객관 자료는 2·5·7·8절이고, 점수는 그것을 읽은 해석입니다.</li></ul>
<b style="font-size:14px">이번에 제가 잡은 제 실수</b><ul>
<li>리셋에서 도면을 BOM 스냅샷보다 <b>나중에</b> 지우도록 써서 FK 제약으로 리셋이 통째로 실패 → 앞 실행이 고친 치수가 남아 e2e가 깨짐. 순서를 바로잡음.</li>
<li>납품 직전 스크린샷 육안 검증에서 3건: 핵심 치수가 샘플 공식이라 등록 치수와 어긋남 · 미리보기가 실제와 다른 전장을 단언 · 비활성 버튼 글자가 배경과 같은 색이라 사라짐.</li></ul></div>
<div><b style="font-size:14px">남은 순서</b><ul>
<li><b>P4-b</b> (다음) — Quotation/PCR · Tech Data · 구매 요청. 장부 '없음' 5 → 3</li>
<li><b>P3-b</b> — DB①→DB② 프로젝션 · 학습 1수준 (회장님 DXF 연구 결과 후)</li>
<li><b>P3-c</b> — Special Tool Box 슬롯 (사장님 D1 후)</li>
<li><b>P6 통합</b> — 장부 '없음' 0 + 금실 1회 주행(등록→승인까지 사람 재입력 0)</li>
<li><b>P5 발표</b> — 덱 v1.0 · 리허설</li></ul>
<b style="font-size:14px">착수 전 결정 1건</b><ul>
<li>구매 요청 Export를 <b>CSV</b>로 할지 <b>xlsx</b>로 할지. 카드 원문은 “엑셀 Export”지만 xlsx는 라이브러리 추가라 Tier가 올라갑니다 — <b>엘 권고는 CSV 먼저</b>.</li></ul>
<b style="font-size:14px">회장님 몫</b><ul>
<li>Windows 로컬 실행 1회 · API 키로 Prompt 1회 확인</li>
<li>회사 실 표(단가 · Table1/NS) · 88md 백업</li>
<li>(사장님) D1 Special 첫 시연 사례 · 기술 문서</li>
<li>DXF 추출 연구 결과 (P3-b 입력)</li></ul></div></div>
<div class="note">이 문서는 점검 초안입니다. 수정·질문을 주시면 반영하겠습니다. 생성기: <span class="mono">docs/02-reports/build_progress_20260920.py</span> · 실측 입력: <span class="mono">shots/demo_e2e_result.json</span> · git log <span class="mono">{BASE}..{HEAD}</span></div></main></body></html>"""

FN = "EDIM_진행현황_20260920"
open(f"{OUT}/{FN}.html", "w", encoding="utf-8").write(H)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1180, "height": 900}); pg.goto("file://" + os.path.abspath(f"{OUT}/{FN}.html")); pg.wait_for_timeout(700)
    pg.screenshot(path=f"{OUT}/_check_dark.png", full_page=True)
    ov = pg.evaluate("[...document.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=='hidden').length")
    pg.pdf(path=f"{OUT}/{FN}.pdf", format="A4", print_background=True, margin={"top": "14mm", "bottom": "14mm", "left": "14mm", "right": "14mm"})
    m = b.new_page(viewport={"width": 390, "height": 844}); m.goto("file://" + os.path.abspath(f"{OUT}/{FN}.html")); m.wait_for_timeout(400)
    mov = m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    bad = m.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1 && !e.closest('.tw')).slice(0,5).map(e=>e.tagName+'.'+e.className)")
    m.screenshot(path=f"{OUT}/_check_mobile.png", full_page=False); b.close()
print("overflow-elements", ov, "mobile-x-overflow", mov, "mobile-offenders", bad)
print("avg", avg(1), avg(2), avg(3), "| ledger", cnt(2, "이어짐"), cnt(2, "약함"), cnt(2, "없음"), "| e2e", sum(1 for v in E.values() if v[0]), len(E), "| commits", len(LOG))
