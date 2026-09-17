# 다음 세션 인계 노트 — 2026-09-18

## 지금 상태 (실측)
- **main = 28ea5a5** (fast-forward 머지 완료, 회장님 승인 2026-09-18). feat/demo-ready와 동일. 옛 브랜치 m1/m2/m3는 모두 main에 포함(삭제 안 함).
- main에 든 것: M1 MainForm · M2 Toolbox run loop · M3 출력(BOM/EBOM/Cost/DXF) · demo-ready(`db:seed:demo`, p14 사양, `scripts/demo_e2e.py`, `docs/DEMO.md`) · **Tier B**(`code_revision` 테이블 append-only+RLS+감사, `/api/rccs/revisions`, Code Builder Save·Rev A/B·이력, Inspector Rev 표시).
- 검증: typecheck 10 green · 테스트 147 · `revision:test` 8/8 · `demo_e2e.py` 13/13 (엘 샌드박스, fresh clone 기준).
- 토큰 `el`: Contents 쓰기 OK, **Pull requests·Workflows 403** — PR과 CI 배치(`docs/ci/ci.yml → .github/workflows/`)는 권한 추가 전엔 회장님 몫.

## 미검증 (그대로 남음)
- 회장님 Windows 로컬 실행 **0회**. DEMO.md §1 통과가 발표 준비 완료 시점.
- 단가·배율·Table1/NS 값은 샘플(회사 표 대기). 도면은 평면 1장.

## 다음 세션 첫 작업 = 결정 A: 발표 덱
- 70장 청사진(EDIM.pdf) ↔ 실동 화면 1:1 매핑 슬라이드. 재료: `shots/`(demo_e2e 산출 스크린샷), DEMO.md 7장면, 청사진 페이지 번호(p5·p14·p24·p27·p56·p59·p62·p65).
- 형식: 화면용 HTML(다크) + 인쇄 PDF(흰) 분리, 렌더 검증 후 납품.

## 시작 절차
```
git clone https://github.com/parksubeom99/EDIM.git && cd EDIM
cp .env.example .env && pnpm install --frozen-lockfile
pnpm db:up && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo
pnpm dev   # 다른 창: python3 scripts/demo_e2e.py http://localhost:3000 shots → 13/13
```
