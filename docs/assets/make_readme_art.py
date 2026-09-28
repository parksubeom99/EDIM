#!/usr/bin/env python3
"""README 그림 만들기 — 밝은/어두운 두 벌을 같은 틀에서 만든다(GitHub <picture> 로 테마에 맞춰 보인다).
usage: python docs/assets/make_readme_art.py   → docs/assets/*.svg
수치는 아래 STATS 한 곳만 고친다(README 배지 · 검증 표와 같은 값).
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
STATS = [("348/348", "e2e 단계 · 개발 + 운영"), ("295", "단위 테스트"), ("11종", "DB 검증 스위트"), ("0", "런타임 LLM 호출")]
FONT = "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', sans-serif"
MONO = "'JetBrains Mono', Consolas, 'SFMono-Regular', monospace"

THEMES = {
    "light": dict(bg="#ffffff", bg2="#f3f7f9", card="#ffffff", line="#d5dee6", ink="#17202b", mut="#566273",
                  teal="#0e7c6b", teal2="#e3f4f0", amber="#a66d00", amber2="#fbf1dc", red="#c0392b", glow="#0e7c6b"),
    "dark": dict(bg="#0d1117", bg2="#111821", card="#161b22", line="#2b3642", ink="#e6edf3", mut="#8b98a5",
                 teal="#3fb9a3", teal2="#123a34", amber="#e0a93b", amber2="#3a2c10", red="#f07167", glow="#3fb9a3"),
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def box(x, y, w, h, t, title, sub="", stroke=None, fill=None, rx=14, tsize=16):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill or t["card"]}" stroke="{stroke or t["line"]}" stroke-width="2"/>'
    ty = y + (h / 2 + 6 if not sub else h / 2 - 3)
    s += f'<text x="{x + w / 2}" y="{ty}" font-size="{tsize}" font-weight="700" fill="{t["ink"]}" text-anchor="middle">{esc(title)}</text>'
    if sub:
        s += f'<text x="{x + w / 2}" y="{y + h / 2 + 17}" font-size="12.5" fill="{t["mut"]}" text-anchor="middle">{esc(sub)}</text>'
    return s


def arrow(x1, y1, x2, y2, t, color=None, w=2.5, dash=None):
    c = color or t["mut"]
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}"{d}/>'
            f'<path d="M{x2},{y2} l-9,-5 l0,10 z" fill="{c}" transform="rotate(0)"/>' if x2 > x1 and y1 == y2 else
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}"{d}/>'
            f'<path d="M{x2},{y2} l-5,-9 l10,0 z" fill="{c}"/>')


def hero(t):
    W, H = 1200, 400
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="{FONT}">',
         '<defs>',
         f'<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{t["bg"]}"/><stop offset="1" stop-color="{t["bg2"]}"/></linearGradient>',
         f'<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="{t["line"]}" stroke-width="0.6" opacity="0.55"/></pattern>',
         '</defs>',
         f'<rect width="{W}" height="{H}" rx="22" fill="url(#g)"/>',
         f'<rect x="600" y="0" width="600" height="{H}" rx="22" fill="url(#grid)"/>',
         f'<rect width="{W}" height="{H}" rx="22" fill="none" stroke="{t["line"]}" stroke-width="1.5"/>']
    # 로고 마크 — 코드 한 줄이 스냅샷 한 장으로 모이는 모양
    s.append(f'<g transform="translate(56,64)"><rect width="64" height="64" rx="16" fill="{t["teal"]}"/>'
             f'<path d="M16 22h32M16 32h22M16 42h28" stroke="{t["bg"]}" stroke-width="5" stroke-linecap="round"/></g>')
    s.append(f'<text x="136" y="112" font-size="52" font-weight="900" fill="{t["ink"]}" letter-spacing="2">EDIM</text>')
    s.append(f'<text x="58" y="172" font-size="27" font-weight="800" fill="{t["ink"]}">제품 코드 한 줄로</text>')
    s.append(f'<text x="58" y="210" font-size="27" font-weight="800" fill="{t["teal"]}">BOM · 도면 · 원가 · 견적 · 구매까지</text>')
    s.append(f'<text x="58" y="246" font-size="15.5" fill="{t["mut"]}">주문생산(Configure-to-Order) 제조사를 위한 CPQ + PLM + ERP 통합 플랫폼</text>')
    s.append(f'<text x="58" y="270" font-size="15.5" fill="{t["mut"]}">모든 산출물은 불변 BOM 스냅샷 한 장에서 · 격리는 PostgreSQL 이 강제 · AI 는 빌드 타임에만</text>')
    # 오른쪽 — 코드 → 스냅샷 → 산출물 다섯
    s.append(f'<rect x="640" y="70" width="210" height="46" rx="10" fill="{t["card"]}" stroke="{t["teal"]}" stroke-width="2"/>')
    s.append(f'<text x="745" y="99" font-size="14" font-family="{MONO}" font-weight="700" fill="{t["teal"]}" text-anchor="middle">EU-25-2123-630SS</text>')
    s.append(f'<line x1="745" y1="116" x2="745" y2="150" stroke="{t["teal"]}" stroke-width="3"/><path d="M745,158 l-6,-10 l12,0 z" fill="{t["teal"]}"/>')
    s.append(f'<ellipse cx="745" cy="170" rx="70" ry="12" fill="{t["teal2"]}" stroke="{t["teal"]}" stroke-width="2"/>'
             f'<rect x="675" y="170" width="140" height="52" fill="{t["teal2"]}"/>'
             f'<line x1="675" y1="170" x2="675" y2="222" stroke="{t["teal"]}" stroke-width="2"/><line x1="815" y1="170" x2="815" y2="222" stroke="{t["teal"]}" stroke-width="2"/>'
             f'<path d="M675,222 A70,12 0 0 0 815,222" fill="{t["teal2"]}" stroke="{t["teal"]}" stroke-width="2"/>'
             f'<ellipse cx="745" cy="170" rx="70" ry="12" fill="{t["teal2"]}" stroke="{t["teal"]}" stroke-width="2"/>'
             f'<text x="745" y="203" font-size="14" font-weight="800" fill="{t["ink"]}" text-anchor="middle">BOM 스냅샷</text>')
    outs = [("BOM", "11행"), ("도면", "DXF 6뷰"), ("원가", "단가 이력"), ("견적", "Word·Excel"), ("구매", "요청→발주")]
    for i, (a, b) in enumerate(outs):
        x = 885 + (i % 3) * 100 if i < 3 else 935 + (i - 3) * 100
        y = 70 if i < 3 else 150
        s.append(f'<rect x="{x}" y="{y}" width="88" height="56" rx="10" fill="{t["card"]}" stroke="{t["line"]}" stroke-width="1.6"/>'
                 f'<text x="{x + 44}" y="{y + 25}" font-size="15" font-weight="800" fill="{t["ink"]}" text-anchor="middle">{a}</text>'
                 f'<text x="{x + 44}" y="{y + 44}" font-size="11.5" fill="{t["mut"]}" text-anchor="middle">{b}</text>')
    s.append(f'<path d="M815,190 C850,190 850,98 885,98" fill="none" stroke="{t["teal"]}" stroke-width="2.2" stroke-dasharray="5 4"/>')
    s.append(f'<path d="M815,195 C860,195 890,178 935,178" fill="none" stroke="{t["teal"]}" stroke-width="2.2" stroke-dasharray="5 4"/>')
    s.append(f'<text x="885" y="246" font-size="12.5" fill="{t["mut"]}">다시 계산하지 않는다 — 같은 runId 를 읽는다</text>')
    # 아래 — 수치 카드 넷
    for i, (v, l) in enumerate(STATS):
        x = 58 + i * 278
        s.append(f'<rect x="{x}" y="298" width="258" height="72" rx="14" fill="{t["card"]}" stroke="{t["line"]}" stroke-width="1.5"/>'
                 f'<rect x="{x}" y="298" width="6" height="72" rx="3" fill="{t["teal"]}"/>'
                 f'<text x="{x + 24}" y="336" font-size="28" font-weight="900" fill="{t["teal"]}">{esc(v)}</text>'
                 f'<text x="{x + 24}" y="358" font-size="13.5" fill="{t["mut"]}">{esc(l)}</text>')
    s.append('</svg>')
    return "".join(s)


def ai(t):
    W, H = 1200, 560
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="{FONT}">',
         f'<rect width="{W}" height="{H}" rx="22" fill="{t["bg"]}" stroke="{t["line"]}" stroke-width="1.5"/>',
         f'<text x="36" y="48" font-size="22" font-weight="800" fill="{t["ink"]}">AI 를 어디에 두고, 어디서 빼는가</text>',
         f'<text x="36" y="74" font-size="14" fill="{t["mut"]}">견적에 환각이 들어갈 경로를 구조로 없앤다 — 사람이 읽고 승인한 식만 실행된다</text>']
    # 1) 매크로 — 빌드 타임 / 런타임
    s.append(f'<rect x="28" y="96" width="770" height="200" rx="18" fill="{t["amber2"]}" opacity="0.55"/>')
    s.append(f'<text x="48" y="124" font-size="13.5" font-weight="800" fill="{t["amber"]}" letter-spacing="1">BUILD-TIME · 사람 + AI · 느린 시계</text>')
    s.append(f'<rect x="812" y="96" width="360" height="200" rx="18" fill="{t["teal2"]}" opacity="0.8"/>')
    s.append(f'<text x="832" y="124" font-size="13.5" font-weight="800" fill="{t["teal"]}" letter-spacing="1">RUN-TIME · 결정론 · LLM 0</text>')
    steps = [("전문가 자연어", "“용량이 25 넘으면…”"), ("번역기", "LLM 자리 · 교체형"), ("검증기", "파스·주소·타입·순환"), ("역번역", "흐름도 · 설명"), ("승인 관문", "초안 → 승인")]
    for i, (a, b) in enumerate(steps):
        x = 44 + i * 150
        st = t["amber"] if a in ("번역기",) else (t["red"] if a == "승인 관문" else t["line"])
        s.append(box(x, 150, 132, 72, t, a, b, stroke=st))
        if i < 4:
            s.append(f'<line x1="{x + 132}" y1="186" x2="{x + 148}" y2="186" stroke="{t["mut"]}" stroke-width="2.2"/><path d="M{x + 150},186 l-8,-5 l0,10 z" fill="{t["mut"]}"/>')
    s.append(f'<path d="M270,222 C270,270 560,270 560,222" fill="none" stroke="{t["amber"]}" stroke-width="2" stroke-dasharray="5 4"/>')
    s.append(f'<text x="330" y="276" font-size="12.5" fill="{t["amber"]}">검증기 진단을 번역기에 되먹여 재시도</text>')
    s.append(f'<line x1="776" y1="186" x2="842" y2="186" stroke="{t["teal"]}" stroke-width="3.5"/><path d="M850,186 l-10,-6 l0,12 z" fill="{t["teal"]}"/>')
    s.append(f'<text x="780" y="172" font-size="11.5" font-weight="700" fill="{t["teal"]}">승인본만</text>')
    s.append(box(852, 150, 140, 72, t, "결정론 실행기", "같은 입력 = 같은 답", stroke=t["teal"]))
    s.append(f'<line x1="992" y1="186" x2="1012" y2="186" stroke="{t["teal"]}" stroke-width="2.5"/><path d="M1020,186 l-8,-5 l0,10 z" fill="{t["teal"]}"/>')
    s.append(box(1022, 150, 136, 72, t, "BOM · 원가", "도면 · 견적", stroke=t["teal"]))
    # 2) 학습 AI
    s.append(f'<rect x="28" y="314" width="1144" height="226" rx="18" fill="{t["bg2"]}" stroke="{t["line"]}" stroke-width="1.2"/>')
    s.append(f'<text x="48" y="342" font-size="13.5" font-weight="800" fill="{t["teal"]}" letter-spacing="1">학습 AI 1수준 · 플랫폼 DB① 전용 · 에이전트 하네스(도구 = validate → authorize → run)</text>')
    ls = [("① 발췌", "DXF 글자·선·코드"), ("② 정렬화", "사전 + 로컬 AI"), ("③ 공식 탐구", "최소제곱 · 결정론"), ("④ 검증", "DSL · 시험 실행"), ("⑤ 승인", "사람 = 정답 라벨"), ("⑥ 단방향 투영", "π_user → 회사")]
    for i, (a, b) in enumerate(ls):
        x = 44 + i * 188
        wr = i >= 4
        s.append(box(x, 362, 166, 72, t, a, b, stroke=t["red"] if wr else t["teal"], fill=t["card"]))
        s.append(f'<text x="{x + 83}" y="452" font-size="11.5" fill="{t["red"] if wr else t["teal"]}" text-anchor="middle">{"쓰기 · 관리자 승인 필수" if wr else "읽기 전용 · 자동"}</text>')
        if i < 5:
            s.append(f'<line x1="{x + 166}" y1="398" x2="{x + 184}" y2="398" stroke="{t["mut"]}" stroke-width="2.2"/><path d="M{x + 188},398 l-8,-5 l0,10 z" fill="{t["mut"]}"/>')
    s.append(f'<text x="48" y="492" font-size="13.5" fill="{t["ink"]}"><tspan font-weight="800">실측(샘플 68장)</tspan>  숨긴 공식 3/3 복원 · 잡음 도면 3/3 검출 · 미정렬 0 · 유사도 1.00(목표 0.90) · 합격 기준 = 제작 공차 1 mm · 어긋남 ≤ 5 % · 근거 ≥ 10</text>')
    s.append(f'<text x="48" y="518" font-size="13" fill="{t["mut"]}">로컬 AI(Ollama)는 사전 밖 이름을 허용 목록 안에서만 고르고 설명 한 줄을 단다 — 공식은 만들지 않는다 · 외부 API 키 0 · 없으면 결정론 폴백</text>')
    s.append('</svg>')
    return "".join(s)


if __name__ == "__main__":
    for name, fn in (("hero", hero), ("ai-design", ai)):
        for theme, t in THEMES.items():
            p = os.path.join(HERE, f"{name}-{theme}.svg")
            open(p, "w", encoding="utf-8", newline="\n").write(fn(t) + "\n")
            print(p)
