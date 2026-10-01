# ccmd J — 밤샘: B "학습 AI 1수준 + 이중 프로젝션" → C "Special Tool Box 첫 사례(팬 선정)" (2026-09-29)

> 엘 → CC. 근거: 완주 설계안(09-28 회장님 "권고대로 ㄱ") 청크 B·C · 결정 D-3(Special 첫 사례 = 팬 선정) · D-4(샘플로 끝까지 + '샘플' 표지) · D-6(AI 키 없으면 결정론 폴백).
> 회장님 지시(09-29): "3번 학습 AI 만드는데 ai_model.zip 참고해" → 엘이 zip 안의 **에이전트 하네스 설계 패턴**(도구 수명주기 · 계획 · 하위 에이전트 · 권한 관문 · 작업 그래프 · 비용 기록)과 회장님 문서의 **실무 5원칙**(문제정의 · 라벨 품질 · 비용 기준 평가지표 · 배포전략 · 운영 모니터링)을 뽑아 아래 설계에 녹였다.
> **zip 은 CC 에 넘기지 않는다. zip 안의 코드는 한 줄도 복사하지 않는다**(저장소가 공개라 출처가 불분명한 코드는 들어오면 안 된다). 아래 설계만으로 우리 코드를 새로 쓴다.
> 머지: ccmd D~I 와 같은 머지 게이트 통과분만 main fast-forward(회장님 사전 승인 상속). 저장소는 **공개** — 하드 가드 5(비밀값) 그대로.

---

## 0. 이번 밤의 목표 (완료 정의)

| # | 완료 조건 | 증명 |
|---|---|---|
| B1 | 플랫폼 관리자가 도면(DXF)·기술문서를 **DB①에만** 올리면, 학습 작업이 추출 → 정렬화 → 공식 탐구까지 돌고 공식 후보가 적합도와 함께 나온다 | e2e · 캡처 |
| B2 | 샘플 도면 묶음에서 **숨겨 둔 공식 2개를 다시 찾아낸다**(전장 = Σ 구획 길이 · 정해 둔 두 번째 식) — 적합도·근거 도면 수 표시 | e2e 단언 |
| B3 | 관리자가 승인한 공식만 **π_user 로 회사 착지 표에 한쪽 방향 복사** → 회사 Toolbox 에 '학습 제안'으로 보이고, 회사가 채택하면 그 회사 매크로 등록부에 들어간다 | e2e |
| B4 | 역류 0: 회사 계정은 DB① 을 **읽지도 쓰지도** 못하고, 플랫폼은 회사 업무 표를 **읽지** 못한다 — DB 권한으로 증명 | `learning:test` |
| B5 | 구조 유사도 계기판: 투영본이 DB② 형식에 맞는 비율(목표 ≥ 0.90)이 숫자로 나온다 | 화면 · 단위 테스트 |
| C1 | Special '팬 선정'이 등록·의뢰·승인·제공·실행·과금 기록까지 한 줄로 돈다 | e2e |
| C2 | 풍량·정압 → 팬 곡선 보간 → 동작점 · 효율 · 축동력 · 모터 kW — 손 계산 값과 일치 | 단위 테스트 |
| C3 | Special 입력 화면은 Toolbox 에서 만든 UI 폼을 **그대로** 쓴다 | e2e |

못 한 항목은 FAIL 로 적고 다음으로 간다. **B 를 먼저 끝까지**(머지까지) 하고 C 로 넘어간다.

## 1. 하드 가드 (ccmd I 와 같음 + 이번 추가)

1~8. ccmd I 의 하드 가드 1~8 그대로(main 직접 커밋·force push·이력 재작성 금지 · 마이그레이션 추가만 · 스냅샷 불변 · viewer 403/타사 404 · 비밀값 grep · Windows 교훈 · 시연 대본 동기화 · 태그 불변).
9. **platform 스키마는 이번에 처음 넓힌다** — 추가만. `edim_app` 은 platform 스키마에 아무 권한도 없다(지금 그대로). `edim_platform` 은 public 의 회사 업무 표를 읽을 수 없다(지금 그대로). DB①→DB② 쓰기는 **SECURITY DEFINER 함수 하나**로만 연다(아래 B-3).
10. 런타임 LLM 호출 0. 공식 탐구·정렬화·발췌는 결정론. LLM 자리는 인터페이스만(키 없으면 폴백 — D-6).
11. 샘플 자료는 전부 파일 이름·화면·보고서에 **'샘플'** 표지.

**머지 게이트:** ccmd I 와 같음 + 새 DB 테스트 `learning:test`(B) · `special:test`(C) 를 DB 검증 목록과 CI 에 추가(→ 11종).

---

## STEP 0 — 실측

```
cd C:\dev\EDIM && git fetch --all --prune && git rev-parse origin/main && git status --short
pnpm --filter @edim/db platform:test
```
기대: main `5e11d49`(다르면 적고 진행). 이어서 **DXF 읽기 경로 결정**: 우리 DXF 생성기(`/api/dxf`)가 만든 파일을 파서 후보(`dxf-parser` 정확한 버전 고정)로 읽어 DIMENSION(측정값)·TEXT·LINE·레이어가 다 나오는지 10분 시험. DIMENSION 측정값이 안 나오면 **우리 생성기가 치수 문자에 넣는 값**을 TEXT 에서 읽는 방식으로 간다(보고서에 선택과 이유).

---

# B — 학습 AI 1수준 + 이중 프로젝션

## B-0. 설계 한 장 (이대로 구현)

```
[회사 원천 자료: DXF·문서]  --(플랫폼 관리자만 업로드)-->  DB① platform 스키마
        │
        ▼  학습 작업(Job) = 계획된 단계 목록 · 단계마다 도구 1개
   ① extract     (읽기 전용)  도면 → 특징 행(치수·레이어·블록·문자)          ← 발췌 에이전트
   ② align       (읽기 전용)  특징 이름·단위·코드 슬롯을 EDIM 형식으로 정렬 ← 정렬화 에이전트
   ③ mine        (읽기 전용)  정렬된 특징들 사이의 공식 후보 탐구 + 적합도
   ④ verify      (읽기 전용)  후보를 Macro DSL 로 적어 검증기·시험 실행 통과
   ⑤ approve     (쓰기·관리자 승인 필수)  후보 → 승인 공식 (라벨)
   ⑥ project     (쓰기·관리자 승인 필수)  승인 공식 → π_user → 회사 착지 표 (한쪽 방향)
        │
        ▼
   DB② public.learned_suggestion (회사별 RLS)  →  Toolbox '학습 제안'  →  회사 채택 → 그 회사 macro 등록부
```

하네스 패턴을 이렇게 옮긴다(코드가 아니라 **구조**만):
- **도구 = 수명주기 3단**: `validate(input)` → `authorize(ctx)` → `run(input, ctx)`. 각 도구는 `readOnly` 표시를 가진다. `readOnly=false` 도구(approve·project)는 **관리자 승인 관문**을 통과해야만 돈다.
- **도구 등록부 한 곳**: `apps/web/app/lib/learning/tools.ts` 에 이름 → 도구 맵. 작업 실행기는 맵을 돌 뿐 도구를 몰라도 된다(도구 추가 = 항목 하나 추가).
- **계획 먼저**: 작업을 만들 때 단계 목록을 `learning_job.plan` 에 먼저 적고, 실행은 그 목록을 따른다. 단계 상태(대기·실행·완료·실패)는 `learning_step` 에 남는다(= 작업 그래프, 재시작 가능).
- **하위 에이전트 = 입력만 보는 격리 작업자**: extract·align 은 각자 자기 입력(원천 1건 · 특징 묶음)만 받고 결과를 표에 쓴다. 서로의 중간 상태를 공유하지 않는다.
- **비용 기록**: 단계마다 소요 ms · 처리 행 수 · LLM 토큰(지금 0)을 `learning_step.cost` 에 남긴다 → 나중 과금·운영의 근거.
- **지식은 필요할 때만**: 정렬화 사전(아래 B-2)은 align 도구가 부를 때만 읽는다.

## B-1. 마이그레이션 0033 `learning` (추가만 · platform 스키마)

- `platform.learning_source` 에 열 추가: `file_key text`(F4 attachment 저장소 키 재사용 방식과 같은 저장소 · 단 platform 전용 경로) · `sha256 text` · `origin text`(예: 'sample' · 'tenant-consented') · `is_sample boolean default false`.
- `platform.learning_job`(id · title · plan jsonb · state · created_by · created_at · finished_at)
- `platform.learning_step`(id · job_id · seq · tool · state · input jsonb · output_ref jsonb · error text · cost jsonb · started_at · finished_at)
- `platform.learning_feature`(id · source_id · name · value numeric · unit · raw_label · layer · aligned_name · aligned_slot · created_at) — extract 가 넣고 align 이 aligned_* 를 채운다
- `platform.learning_formula`(id · job_id · target · expression(Macro DSL) · fit jsonb{n, maxAbsErr, rmse, coverage} · support_sources int · state proposed/approved/rejected · decided_by · decided_at · note)
- `platform.projection_log`(id · formula_id · tenant_id · projected_at · by) — 누가 어느 회사로 무엇을 내보냈나
- `public.learned_suggestion`(id · tenant_id · formula_ref uuid(플랫폼 쪽 id, FK 아님) · target · expression · fit jsonb · state offered/adopted/dismissed · adopted_macro_id · created_at) — **RLS ENABLE·FORCE** · `edim_app` SELECT/UPDATE(state·adopted_macro_id 만) · INSERT 권한 없음
- 함수 `platform.project_formula(formula_id uuid, tenant_id uuid) SECURITY DEFINER` — 승인 상태 공식만 · `learned_suggestion` 에 INSERT 1행 + `projection_log` 1행 · 그 외 아무 것도 안 함. `EXECUTE` 는 `edim_platform` 에게만.
- 투영에서 **빠지는 10%**: source_id · 원천 파일 · 특징 원값 · raw_label · origin — `learned_suggestion` 에는 식·목표·적합도 요약만 간다.

`learning:test`(DB 스크립트, `packages/db/scripts`):
1. `edim_app` → platform.learning_* SELECT/INSERT 모두 permission denied
2. `edim_platform` → public.product_code · bom_code_run · learned_suggestion SELECT denied
3. `edim_platform` 이 `learned_suggestion` 에 직접 INSERT → denied · `project_formula` 로는 성공
4. 미승인(proposed) 공식 투영 → 함수가 거절
5. 회사 A 는 회사 B 의 suggestion 0건(RLS)
6. `edim_app` 이 suggestion 의 expression 을 UPDATE → denied(state 만 가능)

## B-2. 도구 5개의 알맹이

**extract** — DXF 1건 → 특징 행. 치수(측정값·방향·양 끝점 근처의 레이어/블록 이름) · 문자(제품 코드 패턴 `EU-25-2123-…` 등 RCCS 코드가 적혀 있으면 슬롯별로 분해) · 외곽 bbox(전장·전폭·전고 후보). 문서(techdoc)는 1수준에서 **표 형태 CSV/엑셀만**(열 이름 = 특징 이름). PDF 문서 해석은 하지 않는다("아직 없음 — 필요한 입력: 문서 양식").

**align(정렬화)** — 특징 이름을 EDIM 형식으로. 사전 파일 `apps/web/app/lib/learning/align-dictionary.json`(샘플): 동의어("L", "LENGTH", "전장", "Overall L" → `overall_length`) · 단위 환산(inch→mm) · 구획 이름(Mixing·Filter·Coil·Fan … → `section.<name>.length`) · RCCS 슬롯(A~F). 못 맞춘 이름은 `aligned_name = null` 로 두고 화면에 "미정렬 n건"으로 드러낸다(숨기지 않는다 — 라벨 품질).

**mine(공식 탐구)** — 결정론. 한 목표(target) 특징 y 에 대해 같은 도면 안의 다른 정렬 특징 x₁…xₖ 로:
1. 후보 형태: `y = Σ xᵢ`(부분합) · `y = a·x + b`(a ∈ {0.5,1,2,…} 또는 최소제곱) · `y = x₁ + x₂ + c` — **특징 3개 이하**로 제한(조합 폭발 방지 · 최대 후보 수 상한을 두고 초과 시 보고).
2. 적합: 최소제곱 → 각 도면 오차 |ŷ−y|.
3. **합격 기준(비용 기준 — 회장님 문서의 '정확도 대신 업무영향')**: 도면 오차 허용 = **1 mm**(제작 공차) · 허용 안 들어간 도면 비율 ≤ 5 % · 근거 도면 ≥ 10장. 합격 후보만 `proposed`.
4. 같은 목표에 합격 후보가 여러 개면 특징 수가 적은 식 우선(단순한 설명 우선).
5. 결과를 Macro DSL 식으로 적는다(`packages/macro-dsl` 문법 그대로 · 주소는 hierarchy-address 규칙).

**verify** — `packages/macro-verify` 로 파스·주소·타입·순환 검사 + 샘플 도면 3장으로 시험 실행. 통과 못 하면 `rejected` + 사유.

**approve · project** — 관리자 화면 버튼. approve 는 사람이 누르는 **라벨**이다(승인된 공식만 학습 결과로 친다). project 는 회사 선택 → `platform.project_formula` 호출.

**운영 감시(1수준)**: 새 도면을 올릴 때마다 승인 공식에 대어 보고 **어긋나는 도면 수**를 계기판에 표시(분포 변화 경보의 씨앗). 자동 조치는 하지 않는다.

## B-3. 샘플 학습 자료 (D-4 · '샘플')

`packages/db/prisma/seed-learning.ts` + `scripts/make_learning_samples.py`(또는 TS):
- 우리 DXF 생성기로 **샘플 AHU 도면 40장** 생성 — 구획 길이 조합을 바꿔 가며(시드 고정, 재현 가능).
- 숨겨 둔 공식 2개: ① `overall_length = Σ section.*.length` ② `overall_height = casing_height + 2 × base_frame`(생성기 입력에 맞게 CC 가 정하되 **보고서에 정답을 미리 적어 둔다**).
- 잡음 도면 3장: 공식에서 5 mm 어긋난 도면(현장 수정본 흉내) — mine 이 이 3장을 "어긋남"으로 드러내는지 확인.
- 미정렬 이름이 섞인 도면 5장(`Overall L`, `LENGTH` 등) — align 사전이 맞추는지 확인.
- 샘플 기술문서 CSV 1개(코일 열수·핀 피치 → 코일 길이 같은 단순 관계 1개).

## B-4. 화면

- **플랫폼 콘솔**(`/platform`)에 '학습' 탭: 원천 자료 목록(샘플 표지 · sha256 앞 8자리) · 업로드 · 작업 만들기(계획 미리보기) · 단계 진행표(상태·ms·행 수) · 공식 후보 카드(식 · 적합도 · 근거 도면 수 · 어긋난 도면 목록 · 승인/반려) · 투영(회사 선택) · **유사도 계기판**.
- **유사도 = 투영본 중 DB② 형식에 맞는 비율**: 각 learned_suggestion 에 대해 (a) 목표·변수 주소가 그 회사 hierarchy 에 존재 (b) 그 회사 macro 검증기 통과 — 둘 다 맞으면 일치. `일치 수 / 투영 수` 를 표시(목표 0.90). 식은 `apps/web/app/lib/learning/similarity.ts` 한 곳.
- **회사 Toolbox** Program Tool 에 '학습 제안' 목록: 식 · 쉬운 설명(STEP 5 역번역 재사용) · 적합도 요약 · [채택] → 기존 매크로 초안 → 검증 → 승인 흐름 그대로(회사 승인이 한 번 더 — 2단 승인) · [숨기기].

## B-5. 테스트

- 단위: 정렬 사전(동의어·단위) · mine(정답 2개 복원 · 잡음 3장 검출 · 후보 상한) · 유사도 계산 · 도구 수명주기(validate 실패 · readOnly=false 인데 승인 없음 → 거절)
- e2e(새 단계 S70~ · 캡처 `81_learning_job.png`·`82_formula_cards.png`·`83_projection.png`·`84_toolbox_suggestion.png`):
  a. 플랫폼 로그인 → 샘플 40+3+5장 업로드 → 작업 실행 → 모든 단계 완료
  b. 공식 후보 중 숨겨 둔 2개가 **적합도 합격**으로 있음 · 잡음 3장이 어긋남 목록에 있음 · 미정렬 0(사전으로 전부 맞춤) 또는 남은 수 표시
  c. 승인 → 회사 A 로 투영 → 회사 A Toolbox 에 제안 1건 · 회사 B 는 0건
  d. 회사 A 채택 → 매크로 초안 → 검증 → 승인 → 그 매크로로 Run 이 됨
  e. 회사 계정으로 `/api/platform/learning/*` → 403 · 플랫폼 계정으로 회사 API → 403(기존 P3-a 규칙)
  f. 유사도 계기판 숫자 = 단위 테스트 기대값

---

# C — Special Tool Box 첫 사례: 팬 선정

## C-0. 설계 한 장

```
Toolbox UI Tool 에서 만든 폼(풍량·정압·[밀도])  ── 같은 폼 id 를 Special 이 참조 (UI 공유)
          │
회사: Special 의뢰(platform_request kind=special, 이미 있음)
          │  플랫폼 승인
          ▼
public.special_grant(회사별 RLS) ── MainForm/Toolbox 에 'Special: 팬 선정' 버튼이 생김
          │  실행
          ▼
서버 실행기(결정론) ── 바인딩 지도: "어느 표 · 어느 열 · 어느 행 조건"에서 데이터를 가져올지
          │            source = platform(DB① 팬 곡선, 결과만 반환) | tenant(회사 자체 표)
          ▼
public.special_run(회사별 RLS): 입력 · 결과 · 사용 기록 · 요금(샘플 단가)
```

## C-1. 마이그레이션 0034 `special` (추가만)

- `platform.special_program`(id · key 'fan-select' · version · title · ui_form_ref jsonb{tenant 무관 폼 정의 사본 또는 원본 참조} · binding jsonb · price_per_run numeric · currency · state)
- `platform.fan_curve`(id · model · rpm · q_cmh · p_pa · eta · shaft_kw · is_sample) — **샘플 팬 3모델 × 3회전수 × 곡선 점 8개**
- `public.special_grant`(id · tenant_id · program_key · granted_at · request_id) RLS · `edim_app` SELECT 만 · INSERT 는 SECURITY DEFINER `platform.grant_special(request_id)` 로만(요청이 approved 일 때)
- `public.special_run`(id · tenant_id · program_key · version · input jsonb · result jsonb · binding_source text · price numeric · currency · created_by · created_at) RLS · `edim_app` SELECT/INSERT · UPDATE/DELETE 없음(사용 기록 불변 — 과금 근거)
- 실행 시 DB① 팬 곡선 읽기는 SECURITY DEFINER `platform.fan_candidates(q_cmh numeric, p_pa numeric)` — **곡선 원자료가 아니라 계산에 필요한 후보 점만** 돌려준다(관리자 전용 10% 보호). `EXECUTE` 는 `edim_app` 에게(이 함수 하나만).

`special:test`: 회사 계정이 fan_curve 직접 SELECT → denied · 함수로는 후보만 · grant 없는 회사는 실행 API 403 · special_run UPDATE/DELETE denied · 타사 run 0건.

## C-2. 계산 (결정론 · 단위 테스트로 손 계산 대조)

입력: 풍량 Q₀ [CMH] · 기외정압 Pₛ [Pa] · (밀도 ρ, 기본 1.2).
1. 계통 곡선: `P = k·Q²`, `k = Pₛ / Q₀²`.
2. 각 모델·회전수 곡선에서 곡선 P(Q) 와 계통 곡선의 **교점**(동작점)을 곡선 점 사이 선형 보간 + 이분법으로 찾는다. 교점이 곡선 범위 밖이면 그 후보 제외.
3. 교점 Q 가 Q₀ 의 **±5 %** 안인 후보만.
4. 효율 η 는 같은 방식으로 보간 · 축동력 `kW = Q[m³/s] × P / (η × 1000)` (밀도 보정은 ρ/1.2 배).
5. 모터 = 축동력 × 1.15 이상인 **표준 모터 목록**(샘플: 0.75·1.5·2.2·3.7·5.5·7.5·11·15 kW)의 최소값.
6. 선정 = 효율 최대 후보(동률이면 모터 작은 쪽). 결과: 모델 · rpm · 동작점 Q·P · η · 축동력 · 모터 kW · 탈락 후보 수와 이유.
7. 결과 카드에 "샘플 성능표 기준" 표지.

## C-3. 화면 · 흐름

- 플랫폼 콘솔 'Special' 탭: 프로그램 목록(팬 선정 v1 · 단가 샘플) · 들어온 의뢰 → 승인 시 `grant_special` 까지 한 번에.
- 회사 쪽: 기존 Special 의뢰 화면에서 '팬 선정' 의뢰 → 승인되면 Toolbox(및 MainForm Toolbox 버튼 영역)에 'Special: 팬 선정' 버튼 → Toolbox 에서 만든 UI 폼 그대로 열림 → 실행 → 결과 카드 + 사용 기록(오늘 n회 · 요금 합계 샘플).
- 바인딩 지도 보기: 결과 카드 아래 "이 계산이 가져온 자료: 표 · 열 · 조건" 한 줄(무엇을 가져왔는지는 보이되 원자료는 안 보임).
- `source=tenant` 선택지: 회사 ERP 기준정보(0027)에 '팬 성능' 표가 있으면 그걸로 실행 — 1수준에서는 샘플 표 1개로 한 번만 증명.

## C-4. 테스트

- 단위: 교점 보간(손 계산 3건) · 범위 밖 제외 · ±5 % 필터 · 모터 올림 · 동률 처리 · 밀도 보정
- e2e(S80~ · 캡처 `85_special_request.png`·`86_fan_result.png`·`87_special_meter.png`):
  a. 회사 A 의뢰 → 플랫폼 승인 → 회사 A 버튼 생김 · 회사 B 버튼 없음
  b. 입력 12,000 CMH · 600 Pa → 결과 모델·모터 = 단위 테스트 기대값
  c. special_run 1행 · 요금 = 샘플 단가 · 회사 B 0건 · viewer 실행 403(또는 정책에 맞게 — 보고서에 명시)
  d. 폼이 Toolbox 폼과 같은 정의(위젯 id 동일) 단언
  e. 범위 밖 입력(예: 100,000 CMH) → "적합한 팬 없음 — 이유" · 기록은 남되 요금 0

---

## STEP 순서

1. STEP 0 실측 · DXF 경로 결정
2. B-1 마이그레이션 + learning:test → 게이트 1차
3. B-2~B-3 도구·샘플 → 단위
4. B-4 화면 → B-5 e2e → **게이트 · B 머지**
5. C-1 마이그레이션 + special:test
6. C-2 계산 → 단위
7. C-3 화면 → C-4 e2e → **게이트 · C 머지**
8. README: 구조 그림의 "(다음 단계)" 표지를 학습 AI · Special 에서 떼고, "학습 AI 1수준 · Special 첫 사례(샘플 자료)" 절 추가 · 검증 표 갱신 · CI 에 DB 테스트 2종 추가
9. `build_blueprint_match.py` p21 · p23 · p25 · p26 초안 갱신(엘 재측정 전 표기)
10. 보고서 `C:\dev\EDIM_shots\reports\EDIM_report_J_20260930.md`: STEP 별 PASS/FAIL · 해시 · 게이트 수치 · **숨긴 공식 정답표와 찾아낸 식 대조** · 팬 선정 손 계산 대조표 · DXF 경로 선택 이유 · 추가 의존성 버전 · 사이드 이슈 · 회장님 할 일

끝나면 서버 PID 종료 · DB `db:reset:demo` 상태(학습·Special 샘플은 reset 뒤에도 시드로 다시 들어오게).

## 이번 밤 범위 밖

CPQ 가 BOM Run 안에서 Special 을 부르는 것(D 청크) · 컨설팅 뷰 · CAD 1단계 · 확장 1차 · PDF 문서 해석 · 실제 LLM 호출.
