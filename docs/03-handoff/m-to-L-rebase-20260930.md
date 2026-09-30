# ccmd L 인계 메모 — M 머지 뒤 rebase (CC → CC · 2026-09-30)

- M 이 머지된 main: `f369926`(fast-forward · PR #2)
- L 작업 자리: worktree `ccmd-edim-file-review-0a058c` · 브랜치 `fix/l-b-tidy` · base `0fbb112` · **미커밋 3파일**(09-30 11:40 기준 · M 은 건드리지 않았다)

## 1. 실측한 충돌 면 (L 의 미커밋 diff 를 M 헤드에 `git apply --check` — 읽기 전용으로 잰 것)

| 파일 | 결과 | 어디 |
|---|---|---|
| `apps/web/app/(app)/drawings/[id]/annotate/annot-editor.tsx` | 깨끗이 붙음 | M 은 이 파일을 건드리지 않았다 |
| `scripts/demo_e2e.py` | **깨끗이 붙음**(줄 오프셋 +14) | L: S69a 끌기 재시도 · M: S10b · S28c 상태 대기 · `quote_expect` 도우미(J0 줄 앞) · S80~S82 추가 · S22b · S22c · S52c · S62c · S75b 견적 단언 |
| `apps/web/app/lib/output/dxf.ts` | **충돌 1곳** — `cadEntities` | M 이 바꾼 두 줄: 함수 서명의 `secs` 타입에 `dir?: string` · 기준점 루프 `datumMm(cad.rules, offs[i]!, sec.len, W, sec.dir)` · `anchorX` 의 `datumMm(…, secs[i]!.dir)`. L 은 같은 루프에서 CADRULE 글자를 `labels` 로 모아 `placeLabels` 로 비킨다 |

풀이: L 의 글자 배치 변경은 그대로 두고, **`datumMm` 호출 두 곳에 M 의 방향 인자(`sec.dir` · `secs[i]!.dir`)만 남긴다.** 함수 서명의 `dir?: string` 도 남긴다(M 의 p36 방향 ↔ 기준점 결합). M 은 `installEntities`(모터 자리)를 `cadEntities` 밖 별도 함수로 두었으니 L 의 `placeLabels` 대상에 모터 글자는 들어가지 않는다 — 모터 글자까지 비키게 할지는 L 판단.

주의: L 의 diff 에는 `placeLabels(labels)` 호출이 있지만 이 3파일 diff 안에 정의가 보이지 않았다(09-30 11:40 스냅샷) — L 이 아직 쓰는 중일 수 있다.

## 2. M 이 바꾼 규칙 중 L 이 알아야 할 것

- **견적 단가 = 스냅샷 원가 × (1 + 요율표 마진율)**(ccmd M-1 · 회장님 결정). 샘플 요율표 `packages/bom-code/cost-rules/pcr-rules.sample.json` 의 `marginPct: 10`. 원가 카드 · PCR Full cost 는 그대로(₩15,487,170). L 이 DEMO 방어 카드 숫자(LC)를 고칠 때 **견적 금액은 ₩17,035,887**(= 15,487,170 × 1.1)이다.
- 판정의 유일한 원천 = `docs/02-reports/build_blueprint_match.py` 의 `PAGES`(판정자 · 판정 근거 칸). L 이 p42 · 43 · 44 · 69 · p58 판정을 바꿀 때는 `PAGES` 만 고치고 생성기를 돌린 뒤 `python docs/02-reports/build_blueprint_match.py --check` 가 OK 인지 본다(보고서 · page-map 손수정 금지).
- 시연은 운영 모드가 기본(DEMO.md 0-A). L 의 새 시연 태그도 운영 모드로.
- 운영 킷 이미지는 `packages/bom-code/cad-rules` · `cost-rules` 를 담는다(Dockerfile runner). L 이 새 규칙 파일 폴더를 만들면 runner 에도 복사 줄을 더한다.

## 3. rebase 뒤 돌릴 검증

```
git fetch origin
git rebase origin/main
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:reset:demo
pnpm typecheck
pnpm -r test
python docs/02-reports/build_blueprint_match.py --check
```

DB 검증 12종(`packages/db/package.json` 의 `*:test` — backbone · rls · revision · platform · drawing · document · project · macro · hierarchy · learning · special · consulting) 전부.
e2e 는 reset 직후 개발 모드 1회 + 운영 모드(`pnpm build` → `pnpm --filter @edim/web start`) 1회. M 머지 시점 기준 e2e 는 **383 단계**다(L 의 추가분은 그 위).
