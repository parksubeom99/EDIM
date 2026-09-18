#!/usr/bin/env python3
"""덱 전용 캡처 — DPR2, 요소/영역 단위. usage: deck_shots.py <base_url> <out_dir>"""
import sys,time,re,io
from playwright.sync_api import sync_playwright
from PIL import Image
BASE,OUT=sys.argv[1],sys.argv[2]
def nuke(pg): pg.evaluate("document.querySelectorAll('nextjs-portal').forEach(e=>e.remove())")
def clip(pg,x,y,w,h): return Image.open(io.BytesIO(pg.screenshot(clip=dict(x=x,y=y,width=w,height=h)))).convert("RGB")
def stack(ims,pad=24,bg=(246,248,250)):
    W=max(i.width for i in ims); H=sum(i.height for i in ims)+pad*(len(ims)+1)
    c=Image.new("RGB",(W+2*pad,H),bg); y=pad
    for i in ims: c.paste(i,(pad,y)); y+=i.height+pad
    return c
def el(pg,sel): 
    l=pg.locator(sel).first; l.scroll_into_view_if_needed(); time.sleep(.3); return Image.open(io.BytesIO(l.screenshot())).convert("RGB")
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1440,"height":900},device_scale_factor=2); pg=ctx.new_page()
    assert ctx.request.post(BASE+"/api/auth/login",data={"email":"owner@acme.test"}).status==200
    pg.goto(BASE+"/workbench",wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder",timeout=30000); time.sleep(2)
    pg.click("text=PS-61313"); time.sleep(1.5); nuke(pg)
    sel=pg.query_selector_all("select"); sel[3].select_option(value="630"); sel[4].select_option(value="SS"); time.sleep(.8); nuke(pg)
    pg.screenshot(path=f"{OUT}/workbench.png")
    stack([clip(pg,0,44,700,68),clip(pg,0,112,255,140),clip(pg,0,736,255,84),clip(pg,0,815,700,85)]).save(f"{OUT}/hierarchy_actionbar.png")
    clip(pg,270,128,815,290).save(f"{OUT}/code_builder.png")
    pg.fill("[data-testid=rev-reason]","initial selection"); pg.click("[data-testid=rev-save]",force=True); time.sleep(2)
    pg.reload(wait_until="domcontentloaded"); pg.wait_for_selector("text=Code Builder"); time.sleep(2); pg.click("text=PS-61313"); time.sleep(1.5); nuke(pg)
    sel=pg.query_selector_all("select"); sel[4].select_option(value="AL"); time.sleep(.6)
    pg.fill("[data-testid=rev-reason]","material change to AL"); pg.click("[data-testid=rev-save]",force=True); time.sleep(2); nuke(pg)
    stack([clip(pg,270,340,815,230),clip(pg,1100,150,340,90)]).save(f"{OUT}/revision.png")
    stack([clip(pg,0,44,420,36),clip(pg,1100,500,340,150)]).save(f"{OUT}/approval.png")
    sel=pg.query_selector_all("select"); sel[4].select_option(value="SS"); time.sleep(.6)
    pg.locator("button",has_text=re.compile(r"^Macro$")).first.click(force=True); time.sleep(1.5)
    pg.click("[data-testid=macro-verify]"); time.sleep(2); pg.click("[data-testid=macro-draft]"); time.sleep(2.5)
    ap=pg.query_selector("[data-testid=macro-approve]"); ap and ap.click(); time.sleep(2.5); nuke(pg)
    clip(pg,270,128,815,330).save(f"{OUT}/macro_approve.png")
    pg.click("button:has-text('EDIM Run')"); time.sleep(3); nuke(pg)
    stack([clip(pg,270,128,815,330),clip(pg,255,736,845,84),clip(pg,760,815,680,85)]).save(f"{OUT}/edim_run.png")
    pg.locator("button",has_text=re.compile(r"^BOM$")).first.click(force=True); time.sleep(1)
    for k in ("BOM Run","EBOM Run","Cost"): nuke(pg); pg.click(f"button:has-text('{k}')",force=True); time.sleep(2.5)
    nuke(pg); bom=el(pg,"[data-testid=bom-panel]"); bom.save(f"{OUT}/bom.png")
    bom.crop((0,80,bom.width,80+2*300)).save(f"{OUT}/bom_spec.png")
    stack([el(pg,"[data-testid=ebom-panel]"),el(pg,"[data-testid=cost-panel]")]).save(f"{OUT}/cost.png")
    pg.locator("button",has_text=re.compile(r"^Design$")).first.click(force=True); time.sleep(1.5); nuke(pg)
    clip(pg,270,128,815,340).save(f"{OUT}/dxf.png")
    b.close(); print("captured")
