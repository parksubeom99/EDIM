#!/usr/bin/env python3
"""ccmd P · STEP 2-3 — 실동 쪽 근거의 e2e 단계 ID 기계 대조.
page-map.md(생성기 출력)의 실동 · 실동(샘플) 쪽마다 '근거' 칸에서 e2e 단계 ID(정규식 S[0-9]+[a-z]?)를 뽑아
  (1) scripts/demo_e2e.py 에 그 ID 의 단언(ok("ID ...)이 있는가 — ID 가 'S62' 처럼 글자 없이 오면 S62a · S62b … 를 모두 그 ID 로 본다
  (2) 결과 JSON(demo_e2e_result.json)에서 PASS 했는가
를 표로 낸다. 근거 ID 가 하나도 없는 실동 쪽은 판정을 바꾸지 않고 목록으로만 보고한다(엘 판정).
사용: python scripts/check_evidence_ids.py <demo_e2e_result.json> [page-map.md]   → 문제 0 이면 종료코드 0
"""
import io, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
res_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "shots", "demo_e2e_result.json")
pm_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "docs", "00-corpus", "page-map.md")
e2e = io.open(os.path.join(ROOT, "scripts", "demo_e2e.py"), encoding="utf-8").read()
keys = sorted(set(re.findall(r'ok\(f?"(S[0-9]+[a-z]?)[ "]', e2e)))
result = json.load(io.open(res_path, encoding="utf-8"))
passed = {k.split(" ")[0]: bool(v[0]) for k, v in result.items() if isinstance(v, list) and k.startswith("S")}

def expand(i):
    return [k for k in keys if k == i or (k.startswith(i) and len(k) == len(i) + 1 and k[-1].isalpha())]

rows, no_id, bad = [], [], 0
for line in io.open(pm_path, encoding="utf-8"):
    if not line.startswith("| p"): continue
    c = [x.strip() for x in line.strip().strip("|").split("|")]
    page, verdict, ev = c[0], c[1], c[-1]
    if not verdict.startswith("실동"): continue
    ids = []
    for m in re.finditer(r"S([0-9]+)([a-z]?)(?:~([a-z]|S?[0-9]+[a-z]?))?", ev):
        base = f"S{m.group(1)}{m.group(2)}"
        ids.append(base)
        if m.group(3) and m.group(2) and len(m.group(3)) == 1:   # S84a~d → S84a · b · c · d
            ids += [f"S{m.group(1)}{chr(x)}" for x in range(ord(m.group(2)) + 1, ord(m.group(3)) + 1)]
    if not ids:
        no_id.append(page); continue
    for i in ids:
        ks = expand(i)
        ok_exist = bool(ks)
        ok_pass = ok_exist and all(passed.get(k, False) for k in ks)
        if not (ok_exist and ok_pass): bad += 1
        rows.append((page, i, ",".join(ks) if ks else "—", "있음" if ok_exist else "없음", "PASS" if ok_pass else "FAIL"))

print("| 쪽 | 근거 ID | e2e 단언 | 존재 | 최종 실행 |")
print("|---|---|---|---|---|")
for r in rows: print("| " + " | ".join(r) + " |")
print(f"\n실동 쪽 근거 ID {len(rows)}개 · 문제 {bad} · 근거 ID 가 없는 실동 쪽 {len(no_id)}: {', '.join(no_id) if no_id else '없음'}")
sys.exit(0 if bad == 0 else 1)
