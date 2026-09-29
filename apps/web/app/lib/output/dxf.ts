import { componentMm, datumMm, kadValues, type Dims, type CadRules, type DetailDim, type At, type Level } from "@edim/bom-code";

/**
 * M3/P4-a — DXF R12(ASCII) 작성기. 순수 함수: 같은 입력 → 같은 바이트.
 *
 * **P4-a 에서 바뀐 것**: 치수를 더 이상 여기서 계산하지 않는다. 예전에는
 * `sqrt(CAP/NS/3600)` 같은 샘플 상수로 단면을 만들어 냈다 — 회사가 표를 고쳐도
 * 도면은 그대로였다. 이제 W·H·L 은 **등록된 Key Dimension 표**(p38~40)에서 오고,
 * 이 파일은 받은 숫자를 그릴 뿐이다. 표에 없으면 호출한 쪽이 거부한다(추측 금지).
 *
 * 두 종류:
 *   plan     — 평면 배치도: 외형 + 섹션 분할 + 전장/단면 치수선
 *   assembly — 조립도(p38·p40): 외형 + 풍선번호 + Item 표가 도면 안에
 */

function line(x1: number, y1: number, x2: number, y2: number, layer = "0"): string {
  return `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
}
function text(x: number, y: number, h: number, value: string, layer = "TEXT"): string {
  return `0\nTEXT\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n${h}\n1\n${value}\n`;
}
function circle(x: number, y: number, r: number, layer: string): string {
  return `0\nCIRCLE\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n${r}\n`;
}
function rect(x: number, y: number, w: number, h: number, layer: string): string {
  return (
    line(x, y, x + w, y, layer) +
    line(x + w, y, x + w, y + h, layer) +
    line(x + w, y + h, x, y + h, layer) +
    line(x, y + h, x, y, layer)
  );
}

const LAYERS: [string, number][] = [
  ["0", 7], ["OUTLINE", 7], ["SECTION", 3], ["DIM", 1], ["TEXT", 5], ["BALLOON", 2], ["TABLE", 4],
];
/** ccmd K · KC-2 — 규칙서가 박힌 스냅샷의 조립도에만 더하는 레이어(기존 도면의 LAYER 표는 그대로 — 바이트 불변). */
const CAD_LAYERS: [string, number][] = [["CADRULE", 6], ["KAD", 30]];
function wrap(ents: string, extra: [string, number][] = []): string {
  const layers = [...LAYERS, ...extra];
  return (
    `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n` +
    `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${layers.length}\n` +
    layers.map(([l, c]) => `0\nLAYER\n2\n${l}\n70\n0\n62\n${c}\n6\nCONTINUOUS\n`).join("") +
    `0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${ents}0\nENDSEC\n0\nEOF\n`
  );
}

/** 도면에 들어가는 한 줄 — BOM 스냅샷의 줄에서 그대로 온다. */
export interface DrawingItem {
  no: number;
  part: string;
  qty: number;
  unit: string;
  childCode?: string;
  remarks?: string;
  /** ccmd K · KA — Special 이 고른 줄이면 그 사양(모델 · rpm · kW). 있으면 Description 칸에 사양을 적는다. */
  spec?: string;
}

export interface DxfInput {
  code: string;
  /** 등록된 Key Dimension (mm) */
  dims: Dims;
  /** 치수 표에서 고른 행(용량 등) — 표제란에 남긴다 */
  dimItem: string;
  sections: string[];
  /** Arrangement: 구획별 길이(mm) + 방향(p36 L0~R270). 없으면 sections.length × L 로 균등 분할. */
  secDims?: { name: string; len: number; dir?: string; components?: { code: string; at: string; level: string }[] }[];
  items?: DrawingItem[];
  /**
   * B · 학습 샘플(정면도만) — 케이싱 위·아래의 프레임(베이스 프레임 · 상부 프레임, 같은 높이).
   * 전고 H = casing + 2 × frame. 제품 도면은 이 값을 넘기지 않으므로 바이트가 그대로다.
   */
  frame?: { casing: number; frame: number };
  /** ccmd K · KC-1 · KC-2 — 스냅샷에 박힌 CAD 규칙서 · 세부 치수. 있으면 조립도에 기준점 · mm 배치 · 세부 치수선 · KAD 슬롯 줄을 더한다. */
  cad?: DxfCad;
}

export interface DxfCad {
  version: string;
  fingerprint: string;
  sample: string;
  rules: CadRules;
  details: DetailDim[];
  /** KAD 슬롯이 읽는 사실: dim.W · dim.H · dim.L(전장) · detail.<대상>.<label> · special.<필드> */
  facts: Record<string, number | string>;
}

/**
 * 조립도의 CAD 규칙서 층 — 전부 규칙서(스냅샷 사본)에서 좌표를 얻는다. 코드에 좌표 상수 없음.
 *   CADRULE: 구획마다 기준점(p36 Point: Shaft · Foot) 십자 + 부품 mm 배치(원 + "코드 @x,y")
 *   DIM    : 세부 치수선 — 대상 구획의 anchor 기준점(또는 대상 부품의 mm 중심)에서 값만큼, 외형 위 띠에 한 줄씩
 *   KAD    : KAD-□ 슬롯 줄(샘플 대응표 · RCCS 문법 미확정) + 규칙서 판 · 지문
 */
function cadEntities(cad: DxfCad, secs: { name: string; len: number; components?: { code: string; at: string; level: string }[] }[], offs: number[], W: number): { s: string; n: number } {
  let s = ""; let n = 0;
  const compAt = new Map<string, { x: number; y: number }>();
  secs.forEach((sec, i) => {
    for (const d of datumMm(cad.rules, offs[i]!, sec.len, W)) {
      s += line(d.x - 60, d.y, d.x + 60, d.y, "CADRULE") + line(d.x, d.y - 60, d.x, d.y + 60, "CADRULE"); n += 2;
      s += text(d.x + 70, d.y + 20, 40, `${d.name.toUpperCase()} ${d.x},${d.y}`, "CADRULE"); n++;
    }
    for (const c of sec.components ?? []) {
      const p = componentMm(cad.rules, offs[i]!, sec.len, W, c.at as At, c.level as Level);
      if (!compAt.has(c.code)) compAt.set(c.code, p);
      s += circle(p.x, p.y, 40, "CADRULE"); n++;
      s += text(p.x + 50, p.y - 20, 45, `${c.code.toUpperCase()} @${p.x},${p.y}`, "CADRULE"); n++;
    }
  });
  const anchorX = (target: string): number => {
    const i = secs.findIndex((x) => x.name === target);
    if (i >= 0) return datumMm(cad.rules, offs[i]!, secs[i]!.len, W).find((d) => d.name === cad.rules.detail.anchor)?.x ?? offs[i]!;
    return compAt.get(target)?.x ?? 0;   // 배치 안 된 부품 대상이면 원점에서(자리를 지어내지 않는다)
  };
  cad.details.forEach((d, k) => {
    const x0 = anchorX(d.target), x1 = x0 + d.value, y = W + cad.rules.detail.startMm + k * cad.rules.detail.gapMm;
    s += line(x0, y, x1, y, "DIM") + line(x0, y - 50, x0, y + 50, "DIM") + line(x1, y - 50, x1, y + 50, "DIM"); n += 3;
    s += text(x0 + 20, y + 40, 55, `detail.${d.target}.${d.label}=${d.value}`, "DIM"); n++;
  });
  const kv = kadValues(cad.rules, cad.facts);
  const ky = W + 560;
  s += text(0, ky, 70, cad.rules.kad.prefix, "KAD"); n++;
  kv.forEach((v, j) => {
    const x = 420 + j * 720;
    s += rect(x, ky - 40, 680, 140, "KAD"); n += 4;
    s += text(x + 30, ky, 60, `${v.slot}:${v.value}`, "KAD"); n++;
  });
  s += text(420 + kv.length * 720 + 60, ky, 45, `${cad.rules.kad.prefix}${kv.map((v) => v.value).join("-")} · CAD RULES ${cad.version} #${cad.fingerprint} (SAMPLE)`, "KAD"); n++;
  return { s, n };
}

/** 3각법 뷰 — plan=Top(L×W) · front=Front(L×H) · right=Right(W×H) · assembly=조립도 */
export type DrawingView = "plan" | "assembly" | "front" | "right" | "iso" | "exploded";

export interface DxfMeta {
  type: DrawingView;
  sections: string[];
  /** 구획별 방향(없으면 null) — 평면도에만 적는다 */
  dirs?: (string | null)[];
  /** 구획 안 부품 배치(p36) — 평면도에 상자로 그린다 */
  components?: { section: string; code: string; at: string; level: string }[];
  widthMm: number;
  heightMm: number;
  lengthMm: number;
  dimItem: string;
  entities: number;
  items?: number;
}

/** 평면 배치도 — 외형·섹션 분할·치수선. 치수는 전부 등록 표에서 온다. */
export function buildPlanDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, L } = input.dims;
  const secs: { name: string; len: number; dir?: string; components?: { code: string; at: string; level: string }[] }[] = (input.secDims && input.secDims.length > 0)
    ? input.secDims
    : (input.sections.length > 0 ? input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  const offs: number[] = []; let acc = 0;
  for (const s of secs) { offs.push(acc); acc += s.len; }
  const length = acc;
  const sections = secs.map((s) => s.name);
  let ents = "";
  let n = 0;

  ents += rect(0, 0, length, W, "OUTLINE"); n += 4;
  secs.forEach((s, i) => {
    if (i > 0) { ents += line(offs[i]!, 0, offs[i]!, W, "SECTION"); n++; }
    ents += text(offs[i]! + 120, W / 2, 60, s.name.toUpperCase()); n++;
    // Arrangement 2차: 그 구획에 등록된 방향(p36 Fan Direction)을 구획 안에 적는다. 미등록이면 아무것도 안 적는다.
    if (s.dir) { ents += text(offs[i]! + 120, W / 2 - 160, 50, `DIR ${s.dir}`); n++; }
    // Component 배치(p36) — 구획을 3×3 칸으로 보고 그 칸 가운데에 부품 상자를 그린다.
    // Top View 라 앞·중·뒤 = 길이 방향, 상·중·하 = 폭 방향이다(높이는 정면도가 본다).
    for (const c of s.components ?? []) {
      const ax = { front: 0, center: 1, rear: 2 }[c.at as "front" | "center" | "rear"] ?? 1;
      const ly = { top: 2, mid: 1, bottom: 0 }[c.level as "top" | "mid" | "bottom"] ?? 1;
      const cw = s.len / 3, ch = W / 3;
      const x0 = offs[i]! + ax * cw + cw * 0.15, y0 = ly * ch + ch * 0.2;
      ents += rect(x0, y0, cw * 0.7, ch * 0.6, "COMPONENT"); n += 4;
      ents += text(x0 + 40, y0 + ch * 0.25, 45, c.code.toUpperCase()); n++;
    }
  });
  ents += line(0, -300, length, -300, "DIM"); ents += text(length / 2 - 200, -420, 70, `L=${length}`); n += 2;
  ents += line(-300, 0, -300, W, "DIM"); ents += text(-900, W / 2, 70, `W=${W}`); n += 2;
  ents += text(0, W + 300, 90, `EDIM ${input.code} - PLAN - DIM ${input.dimItem}`); n++;

  return {
    dxf: wrap(ents),
    meta: { type: "plan", sections, dirs: secs.map((s) => s.dir ?? null),
      components: secs.flatMap((s) => (s.components ?? []).map((c) => ({ section: s.name, ...c }))), widthMm: W, heightMm: input.dims.H, lengthMm: length, dimItem: input.dimItem, entities: n },
  };
}

/**
 * 조립도(p38·p40) — 같은 외형에 **풍선번호**를 찍고, 도면 안에 Item 표를 그린다.
 * 표의 내용은 BOM 스냅샷 줄이다. "코드 하나가 도면과 BOM 을 동시에 낳는다"가
 * 종이 한 장에서 보인다.
 */
export function buildAssemblyDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, H, L } = input.dims;
  const secs: { name: string; len: number; dir?: string; components?: { code: string; at: string; level: string }[] }[] = (input.secDims && input.secDims.length > 0)
    ? input.secDims
    : (input.sections.length > 0 ? input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  const offs: number[] = []; let acc = 0;
  for (const s of secs) { offs.push(acc); acc += s.len; }
  const items = (input.items ?? []).slice(0, 20);
  const length = acc;
  const sections = secs.map((s) => s.name);
  let ents = "";
  let n = 0;

  ents += rect(0, 0, length, W, "OUTLINE"); n += 4;
  secs.forEach((s, i) => {
    if (i > 0) { ents += line(offs[i]!, 0, offs[i]!, W, "SECTION"); n++; }
    ents += text(offs[i]! + 120, W - 200, 55, s.name.toUpperCase()); n++;
  });

  const r = 130;
  items.forEach((it, i) => {
    const cx = Math.round(((i + 0.5) * length) / Math.max(items.length, 1));
    const cy = Math.round(W / 2);
    ents += circle(cx, cy, r, "BALLOON"); n++;
    ents += line(cx, cy - r, cx, 0, "BALLOON"); n++;
    ents += text(cx - 45, cy - 40, 90, String(it.no), "BALLOON"); n++;
  });

  const rowH = 260;
  const tblY = -900;
  const colX = [0, 500, 3400, 4200];
  const tblW = 6200;
  const rows = items.length + 1;
  for (let i = 0; i <= rows; i++) { ents += line(0, tblY - i * rowH, tblW, tblY - i * rowH, "TABLE"); n++; }
  for (const x of [...colX, tblW]) { ents += line(x, tblY, x, tblY - rows * rowH, "TABLE"); n++; }
  const head = ["Item", "Description", "Q'ty", "Remarks"];
  head.forEach((h, i) => { ents += text(colX[i]! + 60, tblY - rowH + 80, 95, h, "TABLE"); n++; });
  items.forEach((it, i) => {
    const y = tblY - (i + 2) * rowH + 80;
    const cells = [String(it.no), it.spec ?? it.part, `${it.qty} ${it.unit}`, it.childCode ?? it.remarks ?? ""];
    cells.forEach((c, k) => { ents += text(colX[k]! + 60, y, 90, c.slice(0, 38), "TABLE"); n++; });
  });

  ents += text(0, W + 300, 90, `EDIM ${input.code} - ASSEMBLY - DIM ${input.dimItem} (W${W} H${H} L${L})`); n++;
  if (input.cad) { const c = cadEntities(input.cad, secs, offs, W); ents += c.s; n += c.n; }

  return {
    dxf: wrap(ents, input.cad ? CAD_LAYERS : []),
    meta: { type: "assembly", sections, widthMm: W, heightMm: H, lengthMm: length, dimItem: input.dimItem, entities: n, items: items.length },
  };
}

/**
 * 정면도(Front View · 3각법) — 평면도와 **같은 스냅샷 치수·같은 구획**을 쓴다.
 * 가로 = 전장(구획 길이의 합, 평면도와 같은 값) · 세로 = 높이 H.
 * 코퍼스 "2D와 3D의 관계": 같은 Parameter Set 을 공유하므로 뷰마다 치수를 따로 계산하지 않는다.
 */
export function buildFrontDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, H, L } = input.dims;
  const secs: { name: string; len: number; dir?: string; components?: { code: string; at: string; level: string }[] }[] = (input.secDims && input.secDims.length > 0)
    ? input.secDims
    : (input.sections.length > 0 ? input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  const offs: number[] = []; let acc = 0;
  for (const s of secs) { offs.push(acc); acc += s.len; }
  const length = acc;
  const sections = secs.map((s) => s.name);
  let ents = ""; let n = 0;

  ents += rect(0, 0, length, H, "OUTLINE"); n += 4;
  secs.forEach((s, i) => {
    if (i > 0) { ents += line(offs[i]!, 0, offs[i]!, H, "SECTION"); n++; }
    ents += text(offs[i]! + 120, H / 2, 60, s.name.toUpperCase()); n++;
    if (s.dir) { ents += text(offs[i]! + 120, H / 2 - 160, 50, `DIR ${s.dir}`); n++; }
  });
  if (input.frame) {
    const f = input.frame.frame;
    ents += line(0, f, length, f, "OUTLINE"); ents += line(0, H - f, length, H - f, "OUTLINE"); n += 2;
    ents += text(length + 200, f / 2, 60, `FRAME=${f}`, "DIM"); n++;
    ents += text(length + 200, H / 2, 60, `CASING H=${input.frame.casing}`, "DIM"); n++;
  }
  // 기준선(코퍼스 "기준선/중심선 표시") — 바닥에서 H/2
  ents += line(0, H / 2, length, H / 2, "DIM"); n++;
  ents += line(0, -300, length, -300, "DIM"); ents += text(length / 2 - 200, -420, 70, `L=${length}`); n += 2;
  ents += line(-300, 0, -300, H, "DIM"); ents += text(-900, H / 2, 70, `H=${H}`); n += 2;
  ents += text(0, H + 300, 90, `EDIM ${input.code} - FRONT - DIM ${input.dimItem} (W${W} H${H})`); n++;

  return {
    dxf: wrap(ents),
    meta: { type: "front", sections, dirs: secs.map((s) => s.dir ?? null), widthMm: W, heightMm: H, lengthMm: length, dimItem: input.dimItem, entities: n },
  };
}

/**
 * 우측면도(Right View · 3각법) — 가로 = 폭 W · 세로 = 높이 H.
 * 측면에서는 구획이 겹쳐 보이므로 구획선을 긋지 않고, 구획 수만 표제란에 남긴다.
 */
export function buildRightDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, H, L } = input.dims;
  const secs: { name: string; len: number }[] = (input.secDims && input.secDims.length > 0)
    ? input.secDims
    : (input.sections.length > 0 ? input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  const length = secs.reduce((a, s) => a + s.len, 0);
  const sections = secs.map((s) => s.name);
  let ents = ""; let n = 0;

  ents += rect(0, 0, W, H, "OUTLINE"); n += 4;
  ents += line(W / 2, 0, W / 2, H, "DIM"); n++;              // 중심선
  ents += line(0, -300, W, -300, "DIM"); ents += text(W / 2 - 200, -420, 70, `W=${W}`); n += 2;
  ents += line(-300, 0, -300, H, "DIM"); ents += text(-900, H / 2, 70, `H=${H}`); n += 2;
  ents += text(0, H + 300, 90, `EDIM ${input.code} - RIGHT - DIM ${input.dimItem} (L${length} · ${sections.length} sections)`); n++;

  return {
    dxf: wrap(ents),
    meta: { type: "right", sections, widthMm: W, heightMm: H, lengthMm: length, dimItem: input.dimItem, entities: n },
  };
}

/**
 * 아이소메트릭 투영(등각 · 3D View 1차).
 * **형상 모델이 아니라 투영이다** — 같은 스냅샷의 치수·구획·부품 배치를 30° 등각으로 그린다.
 * 점 (x,y,z) → 화면 (x−z)·cos30, y + (x+z)·sin30. 지금 단계에서 정직한 이름은 "3D 투영 도면"이고,
 * 형상 모델러가 들어오면 같은 drawing_type 위에 내용만 깊어진다.
 */
const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
const iso = (x: number, y: number, z: number): [number, number] => [(x - z) * C30, y + (x + z) * S30];
function isoLine(a: [number, number, number], b: [number, number, number], layer: string): string {
  const [x1, y1] = iso(...a), [x2, y2] = iso(...b);
  return line(x1, y1, x2, y2, layer);
}
/** 직육면체 12모서리 — (x,y,z) 원점에서 (dx,dy,dz) 크기 */
function isoBox(x: number, y: number, z: number, dx: number, dy: number, dz: number, layer: string): { s: string; n: number } {
  const p: [number, number, number][] = [
    [x, y, z], [x + dx, y, z], [x + dx, y + dy, z], [x, y + dy, z],
    [x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz],
  ];
  const e: [number, number][] = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  return { s: e.map(([i, j]) => isoLine(p[i]!, p[j]!, layer)).join(""), n: e.length };
}

export function buildIsoDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, H, L } = input.dims;
  const secs: { name: string; len: number; components?: { code: string; at: string; level: string }[] }[] =
    (input.secDims && input.secDims.length > 0)
      ? input.secDims
      : (input.sections.length > 0 ? input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  let ents = ""; let n = 0; let x = 0;
  for (const s of secs) {
    const b = isoBox(x, 0, 0, s.len, H, W, "OUTLINE"); ents += b.s; n += b.n;
    const [tx, ty] = iso(x + s.len / 2, H + 150, W / 2);
    ents += text(tx - 200, ty, 60, s.name.toUpperCase()); n++;
    // 부품 배치(p36)는 구획 안 3×3 칸의 작은 상자로 같이 세운다 — 평면도와 같은 규칙을 3D 로 본 것뿐이다
    for (const c of s.components ?? []) {
      const ax = { front: 0, center: 1, rear: 2 }[c.at as "front" | "center" | "rear"] ?? 1;
      const lv = { bottom: 0, mid: 1, top: 2 }[c.level as "bottom" | "mid" | "top"] ?? 1;
      const cw = s.len / 3, cz = W / 3, cy = H / 3;
      const cb = isoBox(x + ax * cw + cw * 0.15, lv * cy + cy * 0.15, cz, cw * 0.7, cy * 0.7, cz * 0.7, "COMPONENT");
      ents += cb.s; n += cb.n;
      const [cx2, cy2] = iso(x + ax * cw + cw * 0.2, lv * cy + cy * 0.4, cz);
      ents += text(cx2, cy2, 40, c.code.toUpperCase()); n++;
    }
    x += s.len;
  }
  ents += text(0, -400, 90, `EDIM ${input.code} - ISO - DIM ${input.dimItem} (W${W} H${H} L${x})`); n++;
  return {
    dxf: wrap(ents),
    meta: { type: "iso", sections: secs.map((s) => s.name), widthMm: W, heightMm: H, lengthMm: x, dimItem: input.dimItem, entities: n,
      components: secs.flatMap((s) => (s.components ?? []).map((c) => ({ section: s.name, ...c }))) },
  };
}

/**
 * 분해도(Exploded View · p40 Assembling) — 같은 등각 투영에서 구획을 길이 방향으로 띄우고
 * **조립 순서 번호**를 붙인다. 순서는 구획 순서(Arrangement)가 그대로 정한다 — 따로 적지 않는다.
 */
export function buildExplodedDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, H, L } = input.dims;
  const secs: { name: string; len: number }[] = (input.secDims && input.secDims.length > 0)
    ? input.secDims
    : (input.sections.length > 0 ? input.sections : ["Unit"]).map((name) => ({ name, len: L }));
  const gap = Math.max(300, Math.round(L / 8));
  let ents = ""; let n = 0; let x = 0; let real = 0;
  secs.forEach((s, i) => {
    const b = isoBox(x, 0, 0, s.len, H, W, "OUTLINE"); ents += b.s; n += b.n;
    const [tx, ty] = iso(x + s.len / 2, H + 150, W / 2);
    ents += text(tx - 200, ty, 60, `${i + 1}. ${s.name.toUpperCase()}`); n++;   // 조립 순서 = 구획 순서
    if (i < secs.length - 1) { ents += isoLine([x + s.len, H / 2, W / 2], [x + s.len + gap, H / 2, W / 2], "DIM"); n++; }
    x += s.len + gap; real += s.len;
  });
  ents += text(0, -400, 90, `EDIM ${input.code} - EXPLODED - ${secs.length} sections - DIM ${input.dimItem} (L${real})`); n++;
  return {
    dxf: wrap(ents),
    // lengthMm 은 **실제 전장**이다(띄운 간격은 그리기용이라 치수가 아니다 — 뷰 간 치수 동기화가 깨지지 않게)
    meta: { type: "exploded", sections: secs.map((s) => s.name), widthMm: W, heightMm: H, lengthMm: real, dimItem: input.dimItem, entities: n },
  };
}

/** 뷰 이름 → 생성기 (3각법 + 조립도 + 3D 투영) */
export function buildView(view: DrawingView, input: DxfInput): { dxf: string; meta: DxfMeta } {
  if (view === "assembly") return buildAssemblyDxf(input);
  if (view === "front") return buildFrontDxf(input);
  if (view === "right") return buildRightDxf(input);
  if (view === "iso") return buildIsoDxf(input);
  if (view === "exploded") return buildExplodedDxf(input);
  return buildPlanDxf(input);
}

export const DRAWING_VIEWS: DrawingView[] = ["plan", "front", "right", "assembly", "iso", "exploded"];
export const isDrawingView = (v: unknown): v is DrawingView =>
  typeof v === "string" && (DRAWING_VIEWS as string[]).includes(v);
