#!/usr/bin/env python3
"""ccmd P · STEP 5-3 — 현재 상태를 말하는 문서에 낡은 숫자가 남았는지 찾는다(현재 사실 SSOT = docs/03-handoff/cp4-facts-20261001.md 최종판).
대상: README · docs/DEMO.md · docs/DEPLOY.md · docs/plan/connection-ledger.md · .github/workflows/*.yml 주석 · docs/00-corpus/page-map.md · docs/screens 안내
제외(역사 기록 — 옛 값이 맞음): docs/03-handoff/ · docs/04-decisions/ · changelog · troubleshooting · ADR
히트마다 파일:줄 · 문맥을 낸다. 판정(고침 / 역사라서 둠)은 사람이 한다 — 줄에 날짜 · 'ccmd X 초안' · '→' 같은 이력 표지가 있으면 [이력?] 표시.
사용: python scripts/check_stale_facts.py [추가 옛 값 …]   → 히트 0 이면 종료코드 0
"""
import io, os, re, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
STALE = ["384/384", "383/383", "383단계", "381/381", "371", "단위 347", "단위 346", "단위 테스트 345", "12종", "12 suites", "DB 검증 9종",
         "42 · 5 · 4", "38 · 9 · 4", "46 · 5 · 0", "미착수 4", "68장", "견적=원가", "견적 = 원가 그대로"] + sys.argv[1:]
TARGETS = ["README.md", "docs/DEMO.md", "docs/DEPLOY.md", "docs/plan/connection-ledger.md", "docs/00-corpus/page-map.md"] + \
          glob.glob(os.path.join(ROOT, ".github", "workflows", "*.yml")) + glob.glob(os.path.join(ROOT, "docs", "screens", "*.md"))
HIST = re.compile(r"20\d\d-\d\d-\d\d|ccmd [A-Z]|→|이후|이전|당시|기록|확정판 [0-9]|초안")
hits = 0
for t in TARGETS:
    path = t if os.path.isabs(t) else os.path.join(ROOT, t)
    if not os.path.exists(path): continue
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    for n, line in enumerate(io.open(path, encoding="utf-8"), 1):
        for v in STALE:
            if re.search(r"(?<![0-9])" + re.escape(v) + r"(?![0-9])", line):
                hits += 1
                tag = "[이력?] " if HIST.search(line) else ""
                print(f"{rel}:{n}: {tag}'{v}' — {line.strip()[:160]}")
print(f"\nSTALE_HITS {hits}")
sys.exit(0 if hits == 0 else 1)
