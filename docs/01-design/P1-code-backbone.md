# P1 — 코드 기반 등뼈 (BOM Code Set-Up + BomCodeRun)

> 점검 초안 · 2026-09-19 · 브랜치 `feat/p1-code-backbone` · 근거: EDIM.pdf p30–34, 확정 장부(GAP1 = 코드 기반 BOM, 2026-07-06)
> 승인: 스키마 변경(Tier B) — 회장님 2026-09-19 "다 승인".

## 1. 무엇이 바뀌었나 (한 줄)
BOM이 **함수 안의 목록**(`buildBom`, 슬롯→규칙)에서 **등록된 코드·관계·표**(DB)로 옮겨졌다. 실행 결과는 **스냅샷**(`bom_code_run`)으로 남는다.

## 2. 청사진 ↔ 구현
| 청사진 | 구현 | 화면 |
|---|---|---|
| p31 Sub Code Registration — Item(A~F)별 Sub Item 순번 등록 | `sub_code` | `/setup` S-1-1 |
| p33 Product Code Registration + **Table 참조 / Edit Table** | `product_code` (`tables` jsonb: 슬롯 값으로 행을 찾는 표) | `/setup?tab=product` S-1-3 |
| p34 Product Code Relationship — Child Group(Child·Q’ty·Remarks) · Add Child | `code_relationship` (parent→child, seq, section, qty, unit_cost, when) | `/setup?tab=relationship` S-1-4 |
| p34 Part List Running Test — 슬롯 고르고 Run | `POST /api/setup/part-list-run` (읽기 전용) | 같은 화면 우측 |
| DATA_MODEL BOM/BOMLine → BomCodeRun 스냅샷으로 재배치 | `bom_code_run` (append-only, 카탈로그 지문 포함) | Action Bar BOM Run |

## 3. 설계 결정과 이유
1. **수치는 공식이 아니라 표 조회.** 청사진은 치수·단가를 "Table 참조"(p32·33 Edit Table: Item별 A~E 열)로 둔다. 그래서 엔진에는 산술이 `ROUND(값 × 배율)` 하나뿐이고, 나머지는 전부 `{표.열}` 조회다. 회사 실 표가 오면 **행을 바꾸면 끝**(코드 수정 0) — e2e S10이 이를 증명한다(22→30kW).
2. **Macro DSL을 BOM 수식에 쓰지 않았다.** v1 함수셋(확정)에 SQRT·CEIL이 없어 기존 샘플 공식을 그대로 옮길 수 없다. 함수셋을 늘리는 대신 청사진 방식(표)으로 갔다. Macro는 계속 "승인된 계산값"으로 BOM에 들어온다(`when: {macro:true}` → 방진구 4개).
3. **폴백 없음.** 등록 안 된 제품 코드는 422. 추측한 BOM은 만들지 않는다. 표 참조가 끊기면 `UNKNOWN_REF` 오류 — 조용한 0 없음.
4. **엔진은 순수 패키지**(`@edim/bom-code`, 의존 0). db 패키지는 행만 저장(의존 규칙 db → core-ontology 유지), JSON 형식 검증은 API 경계(`apps/web/app/lib/catalog.ts`).
5. **스냅샷은 덮어쓸 수 없다.** 앱 역할에 UPDATE/DELETE 권한이 없다(code_revision과 같은 방식). 어떤 카탈로그로 돌렸는지 `catalog_fp`로 남는다.
6. **권한**: 읽기 = 로그인한 역할 전부 · 등록 = owner·engineer(서버에서 차단, e2e S11). 플랫폼 관리자 승인("System DB 영향 = Platform 승인", p44·54)은 **P3** 몫 — 여기서는 만들지 않았다.

## 3-b. 추가(같은 날) — 등록이 MainForm까지 이어진다
- **Code Builder 선택지 = 등록된 Sub Code.** `slotDefsFromSubCodes`가 DB 등록값으로 슬롯 카탈로그를 만들고, 워크벤치·`/api/rccs/*`·`/api/dxf` 검증이 모두 그것을 쓴다. 데모 등록값은 기존 상수와 라벨까지 동일(테스트로 고정). 등록이 하나도 없는 테넌트만 샘플 상수로 떨어진다.
- **행 없는 값은 오류.** 표의 `default`는 슬롯이 **비어 있을 때만** 쓴다. 고른 값에 행이 없으면(예: B=80을 Sub Code에만 등록) BOM은 422 + 사유 — 다른 용량의 수치를 빌려 쓰지 않는다(e2e S12).

## 3-c. 회장님 결정 반영 (2026-09-19 "오케이 통일하고 나머지도 맞아")
- **표 모양 통일 = 청사진 모양.** 등록 표는 `TableN` 번호 · **글자 열(A, B, C…)** · **Item 행**이다(p32·33 Edit Table). 같은 표를 두 곳이 읽는다 — BOM은 `{cap.fanKw}`(또는 `{cap.A}`)로 '고른 슬롯 값 = Item' 행을, Macro는 `Table1(A,4:4)`로 '표 번호·열 글자·행 번호'를. 샘플 상수 `Table1`은 이제 등록 표가 없을 때의 대체일 뿐이다. 역번역의 표 이름도 등록된 열 라벨에서 온다. e2e S10d: 표 한 칸(22→30)을 고치면 BOM(30kW)과 **승인 매크로 값(455.4→621)** 이 함께 바뀐다.
- **자식 코드 상속 = 자식 코드 + 부모가 고른 Sub Item 순번.** 그 자식이 실제로 읽는 슬롯만 붙는다(예: Plug fan `KFP 1-4`, Panel `KCP 1-4-1-1`, Main `EU-4-2-1-1`). 빈 슬롯은 0. Part List Running Test · BOM 패널(Code 열) · 스냅샷에 남는다.
- 남은 차이: `Var(NS,…)`와 코드 참조 이름 용어집은 아직 샘플 상수. 기존 RCCS의 F 슬롯("슬롯 순번" 문자열)과 이번 순번 상속의 관계는 정리하지 않았다(문법 결정 필요).

## 4. 검증 (엘 샌드박스 실측)
- 회귀: **1,200개 슬롯 조합**(제품군 3 × 용량 5 × 옵션 5 × 재질 4 × 매크로 4)에서 코드 기반 BOM ≡ 기존 `buildBom` (행·사양·수량·단가 전부 동일). `buildBom`은 이 회귀의 기준값으로만 남김.
- typecheck 11 패키지 · 테스트 **169**(기존 147 + 엔진 11 + 회귀 2 + Code Builder 3 + 역번역 6) · `backbone:test` 13/13(RLS 격리·FK·자기참조 금지·append-only·감사) · `revision:test` · `rls:test`
- `demo_e2e` **39/39** (기존 14 + P1 14 + P2 11): 원가 합계 ₩15,487,170 · 매크로 455.4 **변동 없음**.

## 5. 아직 아닌 것 (정직 고지)
- 표·단가는 **여전히 샘플**이다. M3 샘플 공식의 결과를 등록 표로 1회 옮긴 것. 회사 실 표 필요.
- 다단 BOM(자식의 자식)은 미구현 — 관계 테이블은 허용하지만 엔진은 1단만 편다.
- DXF 도면은 아직 `sectionsOf`(슬롯 규칙)를 쓴다 → P4(치수 전파)에서 등록 데이터로 옮긴다.
- p32 Material code(전압·Hz·IP·Supplier·Price), p35–36 Arrangement Code, DWG 첨부, 등록 건의 Approval Status는 범위 밖.
- 코드/관계 **수정 UI**는 표 편집·추가·삭제까지. 관계 행 편집은 삭제 후 재등록.
- 덤: `rls:test`의 기대값(노드 3개)이 프로젝트 노드 추가 이후 낡아 실패하던 것을 4로 바로잡았다(격리 자체는 정상이었다).

## 6. 발표 장면(신규)
"표 한 칸을 고치면 BOM이 바뀝니다" — Set-Up ▸ Product Code ▸ EU ▸ `cap` 표 55행 fanKw 22→30 → 저장 → BOM Run → Plug fan 30kW. 끝나면 `pnpm db:reset:demo`가 카탈로그까지 원상 복구한다.
