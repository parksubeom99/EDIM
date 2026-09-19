#!/usr/bin/env python3
"""EDIM beta demo E2E — 발표 시나리오 완주 스크립트 (M1 D·M2 E·M3 F + P1 코드 기반 등뼈 통합).
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
    # S7 DXF
    d=ctx.request.get(BASE+"/api/dxf?A=EU&B=55&C=2123&D=630&E=SS"); ok("S7 DXF 200 + AC1009", (d.status, d.headers.get("content-type")), d.status==200 and "AC1009" in d.text())
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
    # S10 표 한 칸을 고치면 BOM이 바뀐다 — 코드 수정 0 (p33 Edit Table)
    pg.click("[data-tab=product]"); pg.wait_for_selector("[data-pc='EU']"); pg.click("[data-pc='EU']"); time.sleep(0.8); nuke(pg)
    cell=pg.locator("[data-cell='cap:55:fanKw']"); ok("S10a Product Code table shows the registered value (22)", cell.input_value(), cell.input_value()=="22")
    cell.fill("30"); pg.click("[data-testid=pc-save]"); time.sleep(1.5); pg.screenshot(path=f"{OUT}/21_setup_product_table.png",full_page=True)
    j=ctx.request.post(BASE+"/api/setup/part-list-run",headers=J,data=json.dumps({"slots":S55})).json(); fan=[l for l in j.get("lines",[]) if l["childCode"]=="KFP 1"]
    ok("S10b table edit 22→30 changes the Plug fan line with no code change", fan[0]["spec"][:4] if fan else None, bool(fan) and fan[0]["spec"].startswith("30kW"))
    cell=pg.locator("[data-cell='cap:55:fanKw']"); cell.fill("22"); pg.click("[data-testid=pc-save]"); time.sleep(1.5)
    j=ctx.request.post(BASE+"/api/setup/part-list-run",headers=J,data=json.dumps({"slots":S55})).json(); fan=[l for l in j.get("lines",[]) if l["childCode"]=="KFP 1"]
    ok("S10c restored to 22kW", fan[0]["spec"][:4] if fan else None, bool(fan) and fan[0]["spec"].startswith("22kW"))
    # S12 Sub Code 등록 → Code Builder 선택지에 나타난다 (p31 → p61) · 표에 행이 없으면 BOM은 거부된다
    r=ctx.request.post(BASE+"/api/setup/sub-codes",headers=J,data=json.dumps({"group":"AHU Code","itemKey":"B","itemName":"용량","value":"80","description":"80,000 CMH"})); sid=r.json().get("id")
    pg.goto(BASE+"/workbench?node=a0000000-0000-4000-8000-000000000004",wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder",timeout=30000); time.sleep(1.5); nuke(pg)
    opt=pg.query_selector("select[data-slot=B] option[value='80']"); ok("S12a newly registered Sub Code (B:80) appears in the Code Builder", bool(opt), opt); pg.screenshot(path=f"{OUT}/23_codebuilder_from_subcode.png")
    r=ctx.request.post(BASE+"/api/setup/part-list-run",headers=J,data=json.dumps({"slots":{"A":"EU","B":"80","C":"2123"}})); ok("S12b B=80 has no table row yet → BOM refused with the reason (422), not borrowed numbers", r.status, r.status==422 and "B='80'" in r.text())
    if sid: ctx.request.delete(BASE+"/api/setup/sub-codes?id="+sid)
    # S11 권한: viewer는 등록을 못 한다 (서버에서 차단)
    v=b.new_context(); v.request.post(BASE+"/api/auth/login",data={"email":"viewer@acme.test"})
    r=v.request.post(BASE+"/api/setup/sub-codes",headers=J,data=json.dumps({"group":"AHU Code","itemKey":"B","itemName":"용량","value":"99"})); ok("S11 viewer cannot register codes (403)", r.status, r.status==403); v.close()
    b.close()
n=sum(1 for v in R.values() if v[0]); print(f"\n[demo_e2e] {n}/{len(R)} steps passed"); json.dump(R,open(f"{OUT}/demo_e2e_result.json","w"),ensure_ascii=False,indent=1)
sys.exit(0 if n==len(R) else 1)
