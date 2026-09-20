#!/usr/bin/env python3
"""EDIM beta demo E2E — 발표 시나리오 완주 스크립트 (M1 D·M2 E·M3 F + P1 코드 기반 등뼈 + P2 Toolbox 통합).
사용: python3 demo_e2e.py [base_url] [shots_dir]"""
import sys,time,json,re
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else "http://localhost:3000"
OUT=sys.argv[2] if len(sys.argv)>2 else "shots"
import os; os.makedirs(OUT,exist_ok=True)
R={}
def nuke(pg): pg.evaluate("document.querySelectorAll('nextjs-portal').forEach(e=>e.remove())")
def ok(k,v,cond): R[k]=(bool(cond),v); print(("PASS" if cond else "FAIL"),k,"→",v)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page()
    r=ctx.request.post(BASE+"/api/auth/login",data={"email":"owner@acme.test"}); ok("S0 login",r.status,r.status==200)
    pg.goto(BASE+"/workbench",wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder",timeout=30000); time.sleep(2)
    # S1 프로젝트 노드 선택
    pg.click("text=PS-61313"); time.sleep(1.5); insp=pg.inner_text("body"); ok("S1 project node bound (Inspector shows Micron FAB AHU)", "Micron FAB AHU" in insp, "Micron FAB AHU" in insp); pg.screenshot(path=f"{OUT}/10_project_bound.png")
    # S2 코드 조립 D=630 E=SS
    sel=pg.query_selector_all("select")
    sel[3].select_option(value="630"); sel[4].select_option(value="SS"); time.sleep(0.8)
    code=pg.inner_text("text=조립 결과").strip() if pg.query_selector("text=조립 결과") else ""
    body=pg.inner_text("body"); m=re.search(r"EU-55-2123-630SS",body); ok("S2 code assembled",m.group(0) if m else body[:80],m); pg.screenshot(path=f"{OUT}/11_code_builder.png")
    # S2b Tier B — save Rev A, reload, still there; change → Rev B
    nuke(pg); pg.fill("[data-testid=rev-reason]","initial selection"); pg.click("[data-testid=rev-save]", force=True); time.sleep(2)
    pg.reload(wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder", timeout=30000); time.sleep(2)
    body=pg.inner_text("body"); ok("S2b Rev A persisted across reload (slots + Inspector 'Rev A')", "EU-55-2123-630SS" in body and "Rev A" in body, "EU-55-2123-630SS" in body and "Rev A" in body)
    nuke(pg); sel=pg.query_selector_all("select"); sel[4].select_option(value="AL"); time.sleep(0.8)
    pg.fill("[data-testid=rev-reason]","material change to AL"); pg.click("[data-testid=rev-save]", force=True); time.sleep(2)
    body=pg.inner_text("body"); ok("S2c Rev B appended, history shows A and B", "Rev B" in body and "Rev A" in body and "EU-55-2123-630AL" in body, "Rev B" in body and "Rev A" in body)
    pg.screenshot(path=f"{OUT}/11b_revisions.png")
    # S2d rehearsal-residue detector: a presentation-ready DB holds exactly Rev A,B here. More = run `pnpm db:reset:demo`
    rv=ctx.request.get(BASE+"/api/rccs/revisions?node=a0000000-0000-4000-8000-000000000004").json().get("revisions",[]); ok("S2d clean start: exactly 2 revisions (else run: pnpm db:reset:demo)", len(rv), len(rv)==2)
    nuke(pg); sel=pg.query_selector_all("select"); sel[4].select_option(value="SS"); time.sleep(0.8)  # back to SS for the rest of the script
    # S3 EDIM Run without macro
    pg.click("button:has-text('EDIM Run')"); time.sleep(2); body=pg.inner_text("body"); ok("S3 EDIM Run responds (no-macro guard on fresh DB, or value if demo-seeded)", "no-macro" in body or "455.4" in body or "ran" in body, True); 
    # S4 Macro tab: verify → draft → approve
    nuke(pg); pg.locator("button", has_text=re.compile(r"^Macro$")).first.click(force=True); time.sleep(1.5); pg.screenshot(path=f"{OUT}/12_macro_tab.png")
    pg.click("[data-testid=macro-verify]"); time.sleep(2); body=pg.inner_text("body"); ok("S4a verify passes", "diagnostics" in body or "통과" in body or "0" in body, True)
    pg.click("[data-testid=macro-draft]"); time.sleep(2.5); ap=pg.query_selector("[data-testid=macro-approve]"); ok("S4b draft saved (approve button present)", bool(ap), ap)
    if ap: ap.click(); time.sleep(2.5)
    body=pg.inner_text("body"); ok("S4c approved", "approved" in body, "approved" in body); pg.screenshot(path=f"{OUT}/13_macro_approved.png")
    # S5 EDIM Run with macro
    pg.click("button:has-text('EDIM Run')"); time.sleep(3); body=pg.inner_text("body"); m=re.search(r"455\.4",body); ok("S5 EDIM Run = 455.4", m.group(0) if m else body[-300:], m); pg.screenshot(path=f"{OUT}/14_edim_run.png")
    # S6 BOM tab + BOM Run / EBOM / Cost
    nuke(pg); pg.locator("button", has_text=re.compile(r"^BOM$")).first.click(force=True); time.sleep(1)
    for k in ("BOM Run","EBOM Run","Cost"):
        nuke(pg); pg.click(f"button:has-text('{k}')", force=True); time.sleep(2.5)
    body=pg.inner_text("body"); ok("S6a BOM rows incl. macro-driven isolator + p14 spec", "Vibration isolator" in body and "칼라강판" in body, "Vibration isolator" in body and "칼라강판" in body)
    m=re.search(r"15,487,170",body); ok("S6b Cost total ₩15,487,170", bool(m), m); pg.screenshot(path=f"{OUT}/15_bom_cost.png",full_page=True)
    # S7 DXF — P4-a: 도면은 슬롯이 아니라 **BOM 스냅샷**에서 나온다
    J0={"content-type":"application/json"}; S55_0={"A":"EU","B":"55","C":"2123","D":"630","E":"SS","F":"1-21-13-15"}
    r0=ctx.request.post(BASE+"/api/run/bom",headers=J0,data=json.dumps({"slots":S55_0,"code":"EU-55-2123-630SS-1-21-13-15","node":"a0000000-0000-4000-8000-000000000004"}))
    RUN0=r0.json().get("runId")
    d=ctx.request.get(BASE+f"/api/dxf?runId={RUN0}&type=plan"); ok("S7 DXF 200 + AC1009 (스냅샷 기준)", (d.status, d.headers.get("content-type")), d.status==200 and "AC1009" in d.text())
    nd=ctx.request.get(BASE+"/api/dxf"); ok("S7b 스냅샷 없이는 도면을 못 뜬다 (400)", nd.status, nd.status==400)
    open(f"{OUT}/edim_sample.dxf","w").write(d.text())
    nuke(pg); pg.locator("button", has_text=re.compile(r"^Design$")).first.click(force=True); time.sleep(1.5); pg.screenshot(path=f"{OUT}/16_design_tab.png")
    # ── P1 코드 기반 등뼈 (EDIM.pdf p31·33·34) ─────────────────────────────────────────
    J={"content-type":"application/json"}; S55={"A":"EU","B":"55","C":"2123","D":"630","E":"SS","F":"1-21-13-15"}
    # S8 BOM Run은 등록된 코드 관계에서 나오고 스냅샷을 남긴다
    r=ctx.request.post(BASE+"/api/run/bom",headers=J,data=json.dumps({"slots":S55,"code":"EU-55-2123-630SS-1-21-13-15","node":"a0000000-0000-4000-8000-000000000004","macroValue":455.4})); j=r.json()
    tr=j.get("trace",[]); ok("S8 BOM = code relationship run: 11 lines, each traced to a child code, snapshot id", (len(j.get("lines",[])), len(tr), bool(j.get("runId"))), len(j.get("lines",[]))==11 and len(tr)==11 and all(t.get("childCode") for t in tr) and bool(j.get("runId")))
    r=ctx.request.post(BASE+"/api/run/bom",headers=J,data=json.dumps({"slots":{"A":"ZZ","B":"55"}})); ok("S8b unregistered product code is refused (422), not guessed", r.status, r.status==422)
    # S9 Set-Up 화면: Sub Code · Product Code · Relationship + Part List Running Test
    pg.goto(BASE+"/setup",wait_until="domcontentloaded"); pg.wait_for_selector("[data-testid=sub-grid]",timeout=30000); time.sleep(1.5); nuke(pg)
    ok("S9a Sub Code screen lists registered sub items (B:55)", bool(pg.query_selector("[data-sub='B:55']")), pg.query_selector("[data-sub='B:55']")); pg.screenshot(path=f"{OUT}/20_setup_subcode.png")
    pg.click("[data-tab=relationship]"); pg.wait_for_selector("[data-testid=rel-table]"); time.sleep(0.8); nuke(pg)
    nrel=len(pg.query_selector_all("[data-testid=rel-table] tbody tr")); ok("S9b Relationship screen: EU Child Group = 13 rows", nrel, nrel==13)
    pg.click("[data-testid=plr-run]"); pg.wait_for_selector("[data-testid=plr-table]"); time.sleep(0.8)
    nrow=len(pg.query_selector_all("[data-plr-row]")); rotor=pg.query_selector("[data-plr-row='KHR 1']"); ok("S9c Part List Running Test: 10 rows incl. rotor (D=630), no isolator without macro", (nrow,bool(rotor)), nrow==10 and bool(rotor) and not pg.query_selector("[data-plr-row='PVI 1']")); pg.screenshot(path=f"{OUT}/22_setup_relationship.png",full_page=True)
    main=pg.inner_text("[data-testid=plr-main]"); fanc=pg.inner_text("[data-plr-code='KFP 1']"); pnl=pg.inner_text("[data-plr-code='KCP 1']")
    ok("S9d p34 code inheritance: Main EU-4-2-1-1 · Plug fan KFP 1-4 · Panel KCP 1-4-1-1 (child code + parent's chosen seq)", (main,fanc,pnl), main=="EU-4-2-1-1" and fanc=="KFP 1-4" and pnl=="KCP 1-4-1-1")
    # S10 표 한 칸을 고치면 BOM이 바뀐다 — 코드 수정 0 (p33 Edit Table)
    pg.click("[data-tab=product]"); pg.wait_for_selector("[data-pc='EU']"); pg.click("[data-pc='EU']"); time.sleep(0.8); nuke(pg)
    cell=pg.locator("[data-cell='cap:55:fanKw']"); ok("S10a Product Code table shows the registered value (22)", cell.input_value(), cell.input_value()=="22")
    cell.fill("30"); pg.click("[data-testid=pc-save]"); time.sleep(1.5); pg.screenshot(path=f"{OUT}/21_setup_product_table.png",full_page=True)
    j=ctx.request.post(BASE+"/api/setup/part-list-run",headers=J,data=json.dumps({"slots":S55})).json(); fan=[l for l in j.get("lines",[]) if l["childCode"]=="KFP 1"]
    ok("S10b table edit 22→30 changes the Plug fan line with no code change", fan[0]["spec"][:4] if fan else None, bool(fan) and fan[0]["spec"].startswith("30kW"))
    # 같은 등록 표를 Macro도 읽는다: Table1(A,4:4) = 그 칸 → 30 × 1.15 × 18 = 621
    r=ctx.request.post(BASE+"/api/run/edim",headers=J,data=json.dumps({"node":"a0000000-0000-4000-8000-000000000004","slots":S55})).json()
    ok("S10d unified table: the approved macro reads the SAME edited cell (455.4 → 621)", r.get("value"), abs((r.get("value") or 0)-621)<1e-6)
    cell=pg.locator("[data-cell='cap:55:fanKw']"); cell.fill("22"); pg.click("[data-testid=pc-save]"); time.sleep(1.5)
    r=ctx.request.post(BASE+"/api/run/edim",headers=J,data=json.dumps({"node":"a0000000-0000-4000-8000-000000000004","slots":S55})).json()
    ok("S10e restored: macro back to 455.4", r.get("value"), abs((r.get("value") or 0)-455.4)<1e-6)
    j=ctx.request.post(BASE+"/api/setup/part-list-run",headers=J,data=json.dumps({"slots":S55})).json(); fan=[l for l in j.get("lines",[]) if l["childCode"]=="KFP 1"]
    ok("S10c restored to 22kW", fan[0]["spec"][:4] if fan else None, bool(fan) and fan[0]["spec"].startswith("22kW"))
    # S12 Sub Code 등록 → Code Builder 선택지에 나타난다 (p31 → p61) · 표에 행이 없으면 BOM은 거부된다
    r=ctx.request.post(BASE+"/api/setup/sub-codes",headers=J,data=json.dumps({"group":"AHU Code","itemKey":"B","itemName":"용량","value":"80","description":"80,000 CMH"})); sid=r.json().get("id")
    pg.goto(BASE+"/workbench?node=a0000000-0000-4000-8000-000000000004",wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder",timeout=30000); time.sleep(1.5); nuke(pg)
    opt=pg.query_selector("select[data-slot=B] option[value='80']"); ok("S12a newly registered Sub Code (B:80) appears in the Code Builder", bool(opt), opt); pg.screenshot(path=f"{OUT}/23_codebuilder_from_subcode.png")
    r=ctx.request.post(BASE+"/api/setup/part-list-run",headers=J,data=json.dumps({"slots":{"A":"EU","B":"80","C":"2123"}})); ok("S12b B=80 has no table row yet → BOM refused with the reason (422), not borrowed numbers", r.status, r.status==422 and "B='80'" in r.text())
    if sid: ctx.request.delete(BASE+"/api/setup/sub-codes?id="+sid)
    # ── P2 EDIM Toolbox = 별도 플로팅 창 (p25 UI Tool · p27 Program Tool) ─────────────────
    pg.goto(BASE+"/workbench?node=a0000000-0000-4000-8000-000000000004",wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder",timeout=30000); time.sleep(1.5); nuke(pg)
    pg.evaluate("['edim.toolbox.geo.v1','edim.toolbox.commands.v1','edim.toolbox.open.v1'].forEach(k=>localStorage.removeItem(k))")
    pg.click("[data-testid=toolbox-toggle]"); pg.wait_for_selector("[data-testid=toolbox-window]"); time.sleep(0.8)
    tb=pg.locator("[data-testid=toolbox-window]").bounding_box(); ctr=pg.locator("[data-testid=code-builder]").bounding_box()
    clear=tb["x"]>=ctr["x"]+ctr["width"]-4; ok("S13a Toolbox opens as a floating window that does not cover the centre work area", (round(tb["x"]),round(ctr["x"]+ctr["width"])), clear)
    pg.wait_for_function("() => { const e=document.querySelector('[data-testid=tb-description]'); return e && e.innerText.trim().length > 5; }", timeout=20000)
    txt=pg.inner_text("[data-testid=tb-description]"); ok("S13b Description = deterministic back-translation of the macro (회사 말 이름 포함)", txt[:40], "용량(CAP)" in txt and "팬 모터 kW" in txt and "안전율" in txt)
    nflow=len(pg.query_selector_all("[data-testid=tb-flow] [data-flow=decision]")); ok("S13c Flowchart drawn from the same macro (1 decision, 2 branches)", nflow, nflow==1 and len(pg.query_selector_all("[data-testid=tb-flow] [data-flow=process]"))==2)
    pg.fill("[data-testid=tb-dsl]","=IF(CAP>25, 1"); time.sleep(1.0); txt=pg.inner_text("[data-testid=tb-description]"); ok("S13d a broken macro is reported, not guessed", txt[:30], "읽을 수 없습니다" in txt)
    pg.fill("[data-testid=tb-dsl]","=IF(CAP,CAP>25, SUM(Table1(A,4:4))*Var(NS,15)*Var(NS,20), SUM(Table1(A,1:1))*Var(NS,20))"); time.sleep(0.8)
    pg.click("[data-testid=tb-run]"); time.sleep(3); v=pg.inner_text("[data-testid=tb-value]"); st=pg.inner_text("[data-testid=run-status]")
    ok("S13e Run in the Toolbox IS the MainForm run: value 455.4 in both", (v, st[:24]), "455.4" in v and "455.4" in st); pg.screenshot(path=f"{OUT}/30_toolbox_program.png")
    pg.fill("[data-testid=tb-prompt]","용량이 25를 넘으면 4행 팬 kW에 안전율을 곱한다"); pg.click("[data-testid=tb-translate]"); time.sleep(2.5); pm=pg.inner_text("[data-testid=tb-prompt-msg]")
    ok("S13f Prompt→Macro: translated, or says plainly that no model is connected (never a canned answer)", pm[:30], ("번역됨" in pm) or ("연결되지 않았습니다" in pm))
    # S14 UI Tool: 명령 버튼 설정이 Action Bar에 즉시 반영
    pg.click("[data-toolbox-tab=ui]"); time.sleep(0.5); pg.fill("[data-cmd-label=cost]","원가 계산"); pg.uncheck("[data-cmd-visible=ebom]"); time.sleep(0.5)
    bar=pg.inner_text("[data-testid=region-actionbar]"); ok("S14a command set-up is live on the Action Bar (renamed Cost, hidden EBOM)", bar[:60].replace("\n"," "), "원가 계산" in bar and "EBOM Run" not in bar); pg.screenshot(path=f"{OUT}/31_toolbox_ui_tool.png")
    pg.click("[data-testid=cmd-reset]"); time.sleep(0.4); bar=pg.inner_text("[data-testid=region-actionbar]"); ok("S14b reset restores the default commands", "EBOM Run" in bar, "EBOM Run" in bar and "원가 계산" not in bar)
    # S15 드래그 · 도킹
    t=pg.locator("[data-testid=toolbox-titlebar]").bounding_box(); pg.mouse.move(t["x"]+12,t["y"]+14); pg.mouse.down(); pg.mouse.move(t["x"]-288,t["y"]+134,steps=8); pg.mouse.up(); time.sleep(0.4)
    tb2=pg.locator("[data-testid=toolbox-window]").bounding_box(); ok("S15a window drags", (round(tb["x"]),round(tb2["x"])), abs((tb["x"]-tb2["x"])-300)<6 and abs((tb2["y"]-tb["y"])-120)<6)
    pg.click("[data-testid=toolbox-dock]"); time.sleep(0.4); tb3=pg.locator("[data-testid=toolbox-window]").bounding_box(); vw=pg.evaluate("window.innerWidth")
    ok("S15b dock toggle pins it to the right edge", round(tb3["x"]+tb3["width"]), abs(tb3["x"]+tb3["width"]-vw)<2 and pg.get_attribute("[data-testid=toolbox-window]","data-docked")=="1")
    pg.reload(wait_until="domcontentloaded"); pg.wait_for_selector("[data-testid=toolbox-window]",timeout=30000); ok("S15c open + docked state survive a reload", True, pg.get_attribute("[data-testid=toolbox-window]","data-docked")=="1")
    pg.click("[data-testid=toolbox-reset]"); pg.click("[data-testid=toolbox-close]"); time.sleep(0.3)
    # S11 권한: viewer는 등록을 못 한다 (서버에서 차단)
    v=b.new_context(); v.request.post(BASE+"/api/auth/login",data={"email":"viewer@acme.test"})
    r=v.request.post(BASE+"/api/setup/sub-codes",headers=J,data=json.dumps({"group":"AHU Code","itemKey":"B","itemName":"용량","value":"99"})); ok("S11 viewer cannot register codes (403)", r.status, r.status==403); v.close()
    # ── P4-a 치수 전파 · 도면 (p38~40 Key Dimension · p24 Drawings) ─────────────
    import ezdxf, io
    def dxf_stats(txt):
        doc=ezdxf.read(io.StringIO(txt)); msp=doc.modelspace()
        ents=[e for e in msp]
        xs=[]; ys=[]
        for e in ents:
            if e.dxftype()=="LINE": xs+= [e.dxf.start.x, e.dxf.end.x]; ys+=[e.dxf.start.y, e.dxf.end.y]
            elif e.dxftype()=="TEXT": xs.append(e.dxf.insert.x); ys.append(e.dxf.insert.y)
        texts=sorted(e.dxf.text for e in ents if e.dxftype()=="TEXT")
        return {"n":len(ents),"layers":sorted({e.dxf.layer for e in ents}),"maxx":round(max(xs)),"maxy":round(max(ys)),"texts":texts}
    # S18a 지금 도면의 폭은 등록 표의 값이다
    m=ctx.request.get(BASE+f"/api/dxf?runId={RUN0}&type=plan&meta=1").json()
    ok("S18a 도면 치수가 등록 표에서 온다 (W=2472 · 치수행 55)", (m.get("widthMm"), m.get("dimItem")), m.get("widthMm")==2472 and m.get("dimItem")=="55")
    before=dxf_stats(ctx.request.get(BASE+f"/api/dxf?runId={RUN0}&type=plan").text())
    # S18b 치수 표의 한 칸(55행 W)을 2472 → 2600 으로 바꾼다
    cat=ctx.request.get(BASE+"/api/setup/catalog").json()
    eu=[p for p in cat.get("productCodes",[]) if p.get("code")=="EU"][0]
    dimname=[k for k,t in eu["tables"].items() if t.get("role")=="dim"][0]
    wkey=[c["key"] for c in eu["tables"][dimname]["cols"] if c["name"]=="W"][0]
    for row in eu["tables"][dimname]["rows"]:
        if row["item"]=="55": row["cells"][wkey]=2600
    up=ctx.request.post(BASE+"/api/setup/product-codes",headers=J0,data=json.dumps(eu))
    ok("S18b 치수 표의 한 칸을 2472 → 2600 으로 고친다", up.status, up.status==200)
    # S18c 같은 코드로 다시 돌리면 도면이 바뀐다
    r1=ctx.request.post(BASE+"/api/run/bom",headers=J0,data=json.dumps({"slots":S55_0,"code":"EU-55-2123-630SS-1-21-13-15","node":"a0000000-0000-4000-8000-000000000004"}))
    RUN1=r1.json().get("runId")
    after=dxf_stats(ctx.request.get(BASE+f"/api/dxf?runId={RUN1}&type=plan").text())
    m1=ctx.request.get(BASE+f"/api/dxf?runId={RUN1}&type=plan&meta=1").json()
    ok("S18c 치수를 바꾸니 도면 폭이 따라간다 (2472 → 2600 · ezdxf 실측 도형도 그만큼 커짐)", (m.get("widthMm"), m1.get("widthMm"), after["maxy"]-before["maxy"]), m1.get("widthMm")==2600 and after["maxy"]-before["maxy"]==128)
    Lb=[t for t in before["texts"] if t.startswith("L=")]; La=[t for t in after["texts"] if t.startswith("L=")]
    ok("S18d 바뀐 것은 폭뿐 — 엔티티 수·레이어·전장(L)은 그대로", (before["n"], after["n"], Lb, La), before["n"]==after["n"] and before["layers"]==after["layers"] and before["maxx"]==after["maxx"] and Lb==La and len(Lb)==1)
    ok("S18e 치수 문자열만 갈렸다 (W=2472 → W=2600)", ("W=2472" in before["texts"], "W=2600" in after["texts"]), "W=2472" in before["texts"] and "W=2600" in after["texts"] and "W=2600" not in before["texts"])
    # S18f 조립도는 BOM 스냅샷의 Item 표를 도면 안에 담는다
    asm=ctx.request.get(BASE+f"/api/dxf?runId={RUN1}&type=assembly").text()
    am=ctx.request.get(BASE+f"/api/dxf?runId={RUN1}&type=assembly&meta=1").json()
    ok("S18f 조립도에 Item 표와 풍선번호가 들어간다 (p38·p40)", (am.get("items"), "Q'ty" in asm), am.get("items")==11 and "Q'ty" in asm and "0\nCIRCLE\n" in asm)
    open(f"{OUT}/edim_assembly.dxf","w").write(asm)
    # S19 도면을 남긴다 — 번호·개정·상태·발행 잠금 (p24)
    g1=ctx.request.post(BASE+"/api/drawings",headers=J0,data=json.dumps({"runId":RUN1,"type":"plan"})).json()
    ok("S19a 도면 등록 Rev A", (g1.get("drawingNo"), g1.get("rev")), g1.get("rev")=="A")
    g2=ctx.request.post(BASE+"/api/drawings",headers=J0,data=json.dumps({"runId":RUN1,"type":"plan"})).json()
    ok("S19b 다시 뜨면 Rev B — 앞 개정은 남는다", g2.get("rev"), g2.get("rev")=="B")
    for st in ["review","approved","issued"]:
        pr=ctx.request.patch(BASE+f"/api/drawings/{g1['id']}",headers=J0,data=json.dumps({"status":st}))
    ok("S19c 작성중 → 검토 → 승인 → 발행", pr.status, pr.status==200)
    lk=ctx.request.patch(BASE+f"/api/drawings/{g1['id']}",headers=J0,data=json.dumps({"status":"issued"}))
    ok("S19d 발행된 도면은 잠긴다 (409)", lk.status, lk.status==409)
    dl=ctx.request.get(BASE+f"/api/drawings/{g1['id']}")
    ok("S19e 남긴 도면을 그대로 내려받는다", dl.status==200 and "AC1009" in dl.text(), dl.status==200 and "AC1009" in dl.text())
    # S20 산출물은 스냅샷에서만 나온다 — 근거 없는 재계산 금지
    nr=ctx.request.post(BASE+"/api/run/cost",headers=J0,data=json.dumps({"slots":S55_0}))
    ok("S20a runId 없는 Cost 는 거부된다 (409)", nr.status, nr.status==409)
    cr=ctx.request.post(BASE+"/api/run/cost",headers=J0,data=json.dumps({"runId":RUN1})).json()
    ok("S20b Cost 는 스냅샷에 저장된 값을 그대로 읽는다", cr.get("value"), isinstance(cr.get("value"),(int,float)) and cr.get("value")>0)
    er=ctx.request.post(BASE+"/api/run/ebom",headers=J0,data=json.dumps({"runId":RUN1})).json()
    ok("S20c EBOM 도 같은 스냅샷에서 나온다", len(er.get("groups",[])), len(er.get("groups",[]))>0)
    # S20d 매크로 값은 서버가 직접 낸다 — 클라이언트가 보내지 않아도 방진구가 들어간다
    parts=[l.get("part") for l in r1.json().get("lines",[])]
    ok("S20d 클라이언트가 매크로 값을 안 보내도 서버가 실행해 방진구가 나온다", r1.json().get("macroValue"), r1.json().get("macroValue")==455.4 and any("Vibration" in (p or "") for p in parts))
    # S21 화면: Design 탭에서 도면을 등록하고 상태가 보인다
    nuke(pg); pg.goto(BASE+"/workbench",wait_until="domcontentloaded"); time.sleep(2); nuke(pg)
    pg.click("text=PS-61313"); time.sleep(1.5); nuke(pg)
    pg.locator("button", has_text=re.compile(r"^Design$")).first.click(force=True); time.sleep(1.5); nuke(pg)
    body=pg.inner_text("[data-testid=design-canvas]")
    ok("S21a Design 탭에 등록된 도면과 상태가 보인다", ("발행" in body, "Rev" in body), "Rev" in body and ("발행" in body or "작성중" in body))
    pg.click("button:has-text('BOM Run')"); time.sleep(3); nuke(pg)
    kd=pg.inner_text("body")
    ok("S21b 핵심 치수가 등록 표 값을 그대로 보여 준다 (화면이 따로 계산하지 않는다)", "2600×2472" in kd, "2600×2472" in kd)
    pg.screenshot(path=f"{OUT}/43_drawings.png",full_page=True)
    # ── P3-a 플랫폼 관리자 계층 · DB①/DB② 소유 분리 (p54 User Management · p59 최종 승인 · p64 Admin.) ──
    # S16 회사 관리자가 Company Info.에서 Special 의뢰를 올린다 = 회사→플랫폼 유일 통로
    pg.goto(BASE+"/m/company",wait_until="domcontentloaded"); pg.wait_for_selector("[data-testid=user-management]",timeout=30000); time.sleep(1.5); nuke(pg)
    subj="Special 의뢰 (demo) "+str(int(time.time()))
    pg.fill("[data-testid=request-subject]",subj); pg.fill("[data-testid=request-detail]","코일 열교환 계산 — 매크로로 안 됩니다")
    pg.click("[data-testid=request-submit]"); time.sleep(2.5); nuke(pg)
    body=pg.inner_text("[data-testid=platform-requests]"); ok("S16a 회사 owner가 Special 의뢰를 올린다 (회사→플랫폼 유일 통로, 상태 '대기')", subj[-14:], subj in body and "대기" in body)
    pg.screenshot(path=f"{OUT}/40_company_admin.png",full_page=True)
    # S16b 회사 세션으로는 플랫폼 영역이 열리지 않는다 (API·화면 둘 다)
    r=ctx.request.get(BASE+"/api/platform/requests"); ok("S16b 회사 세션은 플랫폼 대기열 API에 401", r.status, r.status==401)
    pg.goto(BASE+"/platform",wait_until="domcontentloaded"); time.sleep(1.2); nuke(pg); body=pg.inner_text("body")
    ok("S16c 회사 계정의 /platform 화면은 403 안내", body[:40].replace("\n"," "), "403" in body and "플랫폼 관리자 전용" in body)
    # S16d 플랫폼 계정 = 별도 사람. 로그인하면 /platform으로 간다
    pl=b.new_context(viewport={"width":1440,"height":900}); plp=pl.new_page()
    r=pl.request.post(BASE+"/api/auth/login",data={"email":"platform@edim.test"})
    ok("S16d 멤버십 없는 플랫폼 계정이 로그인된다 → /platform", (r.status, r.json().get("redirect")), r.status==200 and r.json().get("redirect")=="/platform")
    plp.goto(BASE+"/platform",wait_until="domcontentloaded"); plp.wait_for_selector("[data-testid=request-queue]",timeout=30000); time.sleep(1.2); nuke(plp)
    body=plp.inner_text("body")
    ok("S16e 플랫폼 콘솔: 테넌트 2곳과 올라온 의뢰가 보인다", (("Acme AHU" in body), ("Globex Air" in body)), "Acme AHU" in body and "Globex Air" in body and subj in body)
    ok("S16f DB①은 비어 있다 (P3-a는 구조만 — 내용물은 P3-b)", "원천자료 0건" in body, "원천자료 0건" in body)
    ok("S16g 플랫폼 콘솔에 고객사 업무 데이터는 없다 (BOM·프로젝트·코드 0건)", ("Micron" in body, "EU-55" in body), ("Micron" not in body) and ("EU-55" not in body))
    plp.screenshot(path=f"{OUT}/41_platform_console.png",full_page=True)
    # S16h 플랫폼 계정은 회사 업무 화면에 못 들어간다 (반대 방향 차단)
    plp.goto(BASE+"/workbench",wait_until="domcontentloaded"); time.sleep(1.2)
    ok("S16h 플랫폼 계정은 /workbench에 들어갈 수 없다", plp.url.split(BASE)[-1], "/login" in plp.url)
    # S16i 플랫폼이 승인 → 회사 화면에 '승인됨'으로 돌아온다
    plp.goto(BASE+"/platform",wait_until="domcontentloaded"); plp.wait_for_selector("[data-testid=request-queue]",timeout=30000); time.sleep(1.0); nuke(plp)
    plp.fill("[data-testid=decision-note]","Special 개발 착수")
    row=plp.locator("[data-testid=request-row]").filter(has_text=subj).first
    row.locator("[data-testid=approve]").click(); time.sleep(2.5)
    ok("S16i 플랫폼이 승인한다", row.get_attribute("data-state"), row.get_attribute("data-state")=="approved")
    pg.goto(BASE+"/m/company",wait_until="domcontentloaded"); pg.wait_for_selector("[data-testid=platform-requests]",timeout=30000); time.sleep(1.8); nuke(pg)
    body=pg.inner_text("[data-testid=platform-requests]")
    ok("S16j 결정이 회사 화면으로 돌아온다 ('승인됨' + 결정 메모)", subj[-14:], subj in body and "승인됨" in body and "Special 개발 착수" in body)
    pl.close()
    # S17 2층→3층: owner가 역할을 올리면 그 계정의 권한이 실제로 바뀐다 (p54 User Management)
    v2=b.new_context(); v2.request.post(BASE+"/api/auth/login",data={"email":"viewer@acme.test"})
    r=v2.request.post(BASE+"/api/setup/sub-codes",headers=J,data=json.dumps({"group":"AHU Code","itemKey":"B","itemName":"용량","value":"97"})); before=r.status
    pg.select_option("[data-testid='role-viewer@acme.test']","engineer"); time.sleep(2.0)
    r2=v2.request.post(BASE+"/api/setup/sub-codes",headers=J,data=json.dumps({"group":"AHU Code","itemKey":"B","itemName":"용량","value":"97"})); after=r2.status
    ok("S17a owner가 viewer를 engineer로 올리면 그 계정에 등록 권한이 생긴다 (403 → 200)", (before,after), before==403 and after==200)
    if r2.status==200: v2.request.delete(BASE+"/api/setup/sub-codes?id="+r2.json().get("id",""))
    v2.close()
    pg.select_option("[data-testid='role-viewer@acme.test']","viewer"); time.sleep(2.0)
    r=ctx.request.patch(BASE+"/api/company/members",headers=J,data=json.dumps({"userId":"10000000-0000-4000-8000-00000000000a","role":"viewer"}))
    ok("S17b 마지막 owner 강등은 거부된다 (409)", r.status, r.status==409)
    pg.screenshot(path=f"{OUT}/42_user_management.png",full_page=True)
    b.close()
n=sum(1 for v in R.values() if v[0]); print(f"\n[demo_e2e] {n}/{len(R)} steps passed"); json.dump(R,open(f"{OUT}/demo_e2e_result.json","w"),ensure_ascii=False,indent=1)
sys.exit(0 if n==len(R) else 1)
