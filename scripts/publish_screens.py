#!/usr/bin/env python3
"""demo_e2e.py 가 남긴 스크린샷을 repo 의 docs/screens/*.webp 로 올린다.

왜: 스크린샷은 매번 실행 폴더에만 생기고 사라졌다 → repo 에 증빙이 0장이었다(2026-09-21 점검).
usage: python3 scripts/publish_screens.py <shots_dir>     # 예: shots
"""
import os, sys, glob
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "shots"
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "screens")
os.makedirs(DST, exist_ok=True)
n = 0
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    im = Image.open(f).convert("RGB")
    im = im.crop((0, 0, im.width, min(im.height, int(im.width * 1.1))))   # 아주 긴 전체 캡처는 위쪽만
    if im.width > 1440: im = im.resize((1440, int(im.height * 1440 / im.width)), Image.LANCZOS)
    im.save(os.path.join(DST, os.path.splitext(os.path.basename(f))[0] + ".webp"), "WEBP", quality=80, method=6)
    n += 1
print(f"{n} screens -> docs/screens/")
