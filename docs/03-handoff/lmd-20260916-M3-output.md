# lmd — M3 출력부 (2026-09-16 · 엘 샌드박스 실행)

브랜치 `feat/m3-output` (base: feat/m2-toolbox-run) · 원격 push 완료

## 무엇이 닫혔나 — 베타 1수직 end-to-end

코드 조립(M1) → 승인 매크로 실행(M2) → **BOM · EBOM · 원가 · DXF(M3)** 가 한 화면에서 버튼으로 이어짐.

| 출력 | 구현 | 위치 |
|---|---|---|
| Item BOM | 슬롯 → 11행(케이싱·믹싱·필터·[로터]·코일·팬 + 매크로값 기반 방진구) | `lib/output/bom.ts buildBom` (순수) |
| EBOM | 섹션별 그룹 + 소계 (소계 합 = 자재비, 테스트로 고정) | `buildEbom` |
| 원가 | 자재 + 가공 18% + 간접 12% | `buildCost` |
| DXF | R12 ASCII 평면 배치도 — 레이어 OUTLINE/SECTION/DIM/TEXT, 치수 L/H | `lib/output/dxf.ts` · `GET /api/dxf?A=..&B=..` |
| 라우트 | `POST /api/run/{bom,ebom,cost}` 실동 (stub 0 남음) | `api/run/[kind]` |
| UI | BOM 탭 = 표 + EBOM + Cost 카드 · Design 탭 = DXF 다운로드 | `workbench/bom-panel.tsx` |

## DoD 실측 (Playwright · 코드 EU-55-2123-630SS)

| # | 항목 | 결과 |
|---|---|---|
| F1 | 조립 (D=630, E=SS) | `EU-55-2123-630SS` |
| F2 | EDIM Run | 455.4 |
| F3 | BOM Run | API 11행 = 표 11행 · Rotor 포함 · 방진구 spec "for 455 kg (macro)" |
| F4 | EBOM Run | Casing·Mixing·Filter·Rotor·Coil·Fan |
| F5 | Cost | ₩15,487,170 (자재 11,718,500 · 가공 2,109,330 · 간접 1,659,340) — UI = API |
| F6 | DXF | 200 · application/dxf · 1,317B · **ezdxf 독립 파싱: AC1009 · 5레이어 · 18엔티티 · 렌더 정상** |
| 테스트 | apps/web vitest | 33/33 (rccs 10 · approval 8 · provider 6 · output 9) · typecheck GREEN |

## 잡은 결함
- DXF 텍스트의 `·`(non-ASCII)가 R12에서 깨짐 → ASCII `-`로 교체.
- 테스트 정규식이 레이어명 `TEXT`까지 셈 → 엔티티 접두 `0\nTEXT\n`로 정정(코드 결함 아님).

## 정직한 한계 (샘플 → 실값 바인딩 대상)
- 단가·팬 kW·코일 열수·패널 두께·면풍속 계수는 **샘플 상수**. 회사 실 표를 받으면 `provider.ts`/`bom.ts` 상수만 교체.
- DXF는 평면 배치도 1장(정면도·상세도 없음). 실 도면 규격은 CAD팀 확인 대상.
- 원가 배율(18%/12%)은 가정치.
