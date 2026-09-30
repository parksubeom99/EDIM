# 02-reports — 보고서

납품물. 사장님 보고서 등.

## 청사진 70장 대조 — 판정의 유일한 원천 (ccmd M-1 · 2026-09-30)

- **판정(실동 · 실동(샘플) · 부분 · 미착수 · 개념)의 원천은 `build_blueprint_match.py` 의 `PAGES` 한 곳이다.** 각 쪽에 판정자(`judge`)와 판정 근거(`why`)가 있다.
- 보고서 HTML · PDF · [`../00-corpus/page-map.md`](../00-corpus/page-map.md) 는 그 데이터의 **출력**이다. 판정을 바꾸려면 `PAGES` 를 고치고 생성기를 다시 돌린다 — 보고서나 page-map 을 손으로 고치지 않는다.
- 어긋났는지 검사(이미지 없이 돈다):

```bash
python docs/02-reports/build_blueprint_match.py --check
```

  저장소의 page-map.md 가 지금 `PAGES` 의 출력과 한 글자라도 다르면 `DRIFT` 와 함께 종료코드 1.
- 생성: `python docs/02-reports/build_blueprint_match.py <청사진 jpeg 폴더> <e2e 캡처 폴더> <출력 폴더> [표지 라벨]` → HTML 2개 + page-map.md(출력 폴더) → page-map.md 를 `docs/00-corpus/` 로 옮긴다.
