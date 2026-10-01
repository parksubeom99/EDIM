#!/usr/bin/env python3
"""ccmd P · STEP 5-4 — README · docs 아래 md 의 상대 링크 · 이미지 경로가 실제 파일로 풀리는지. 외부(http) · 메일 · 앵커 전용(#…)은 건너뛴다.
코드블록 안은 보지 않는다. 사용: python scripts/check_links.py   → 깨진 링크 0 이면 종료코드 0
"""
import io, os, re, sys, glob
from urllib.parse import unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
files = [os.path.join(ROOT, "README.md")] + glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True)
LINK = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)|(?:src|srcset|href)=\"([^\"]+)\"")
bad, n = [], 0
for f in files:
    text = io.open(f, encoding="utf-8").read()
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    for m in LINK.finditer(text):
        url = (m.group(1) or m.group(2) or "").strip()
        if not url or re.match(r"^(https?:|mailto:|#|data:)", url): continue
        n += 1
        target = unquote(url.split("#")[0].split("?")[0])
        if not target: continue
        p = os.path.normpath(os.path.join(os.path.dirname(f), target))
        if not os.path.exists(p):
            bad.append((os.path.relpath(f, ROOT).replace("\\", "/"), url))
for f, u in bad: print(f"BROKEN {f} → {u}")
print(f"\nLINKS {n} · BROKEN {len(bad)}")
sys.exit(0 if not bad else 1)
