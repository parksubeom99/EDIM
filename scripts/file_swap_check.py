#!/usr/bin/env python3
"""ccmd M · 완료 정의 4 — "회사 실자료는 파일 교체만으로 반영" 을 화면에서 확인하는 보조 스크립트(e2e 밖 · 수동 1회용).

사용: python scripts/file_swap_check.py <base_url> <out_png> <tag>
  작업대에서 시연 코드(EU-55-2123-630SS-1-21-13-15)로 BOM Run → Cost 를 누르고, 원가 카드(cost-total)와 BOM 표의 PFB 1 줄을 읽어
  한 줄 JSON 으로 찍고 화면을 저장한다. 파일 교체 전 · 후에 한 번씩 돌려 숫자를 비교한다(교체 · reset 은 사람이 · DEPLOY.md 9절).
"""
import sys, json, re
from playwright.sync_api import sync_playwright

BASE, OUT, TAG = sys.argv[1], sys.argv[2], sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page()
    r = ctx.request.post(BASE + "/api/auth/login", data={"email": "owner@acme.test", "password": "edim-demo-2026"})
    pg.goto(BASE + "/workbench?node=a0000000-0000-4000-8000-000000000004", wait_until="domcontentloaded")
    pg.wait_for_selector("[data-testid=canvas-cmds][data-ready='1']", timeout=120000)
    sel = pg.query_selector_all("[data-testid=code-builder] select")
    sel[3].select_option(value="630"); sel[4].select_option(value="SS"); sel[5].select_option(value="1-21-13-15")
    pg.wait_for_function("()=>(document.querySelector('[data-testid=assembled-code]')?.innerText||'').includes('EU-55-2123-630SS-1-21-13-15')", timeout=30000)
    pg.evaluate("document.querySelectorAll('nextjs-portal').forEach(e=>e.remove())")
    pg.locator("button", has_text=re.compile(r"^BOM$")).first.click(force=True)
    with pg.expect_response(lambda q: "/api/run/bom" in q.url and q.request.method == "POST", timeout=120000) as br:
        pg.click("button:has-text('BOM Run')", force=True)
    bom = br.value.json()
    with pg.expect_response(lambda q: "/api/run/cost" in q.url and q.request.method == "POST", timeout=120000) as cr:
        pg.click("button:has-text('Cost')", force=True)
    cost = cr.value.json()
    pg.wait_for_selector("[data-testid=cost-total]", timeout=30000)
    shown = pg.inner_text("[data-testid=cost-total]")
    pfb = [l for l in bom.get("lines", []) if l.get("childCode") == "PFB 1"]
    pg.locator("[data-testid=cost-panel]").scroll_into_view_if_needed()
    pg.screenshot(path=OUT, full_page=True)
    print(json.dumps({"tag": TAG, "login": r.status, "costTotalOnScreen": shown, "costApi": (cost.get("cost") or {}).get("total"),
                      "PFB1": [{"qty": l.get("qty"), "unitCost": l.get("unitCost")} for l in pfb]}, ensure_ascii=False))
    b.close()
