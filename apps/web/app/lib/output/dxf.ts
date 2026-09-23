import type { Dims } from "@edim/bom-code";

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
function wrap(ents: string): string {
  return (
    `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n` +
    `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${LAYERS.length}\n` +
    LAYERS.map(([l, c]) => `0\nLAYER\n2\n${l}\n70\n0\n62\n${c}\n6\nCONTINUOUS\n`).join("") +
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
}

export interface DxfInput {
  code: string;
  /** 등록된 Key Dimension (mm) */
  dims: Dims;
  /** 치수 표에서 고른 행(용량 등) — 표제란에 남긴다 */
  dimItem: string;
  sections: string[];
  /** Arrangement: 구획별 길이(mm) + 방향(p36 L0~R270). 없으면 sections.length × L 로 균등 분할. */
  secDims?: { name: string; len: number; dir?: string }[];
  items?: DrawingItem[];
}

export interface DxfMeta {
  type: "plan" | "assembly";
  sections: string[];
  /** 구획별 방향(없으면 null) — 평면도에만 적는다 */
  dirs?: (string | null)[];
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
  const secs: { name: string; len: number; dir?: string }[] = (input.secDims && input.secDims.length > 0)
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
  });
  ents += line(0, -300, length, -300, "DIM"); ents += text(length / 2 - 200, -420, 70, `L=${length}`); n += 2;
  ents += line(-300, 0, -300, W, "DIM"); ents += text(-900, W / 2, 70, `W=${W}`); n += 2;
  ents += text(0, W + 300, 90, `EDIM ${input.code} - PLAN - DIM ${input.dimItem}`); n++;

  return {
    dxf: wrap(ents),
    meta: { type: "plan", sections, dirs: secs.map((s) => s.dir ?? null), widthMm: W, heightMm: input.dims.H, lengthMm: length, dimItem: input.dimItem, entities: n },
  };
}

/**
 * 조립도(p38·p40) — 같은 외형에 **풍선번호**를 찍고, 도면 안에 Item 표를 그린다.
 * 표의 내용은 BOM 스냅샷 줄이다. "코드 하나가 도면과 BOM 을 동시에 낳는다"가
 * 종이 한 장에서 보인다.
 */
export function buildAssemblyDxf(input: DxfInput): { dxf: string; meta: DxfMeta } {
  const { W, H, L } = input.dims;
  const secs: { name: string; len: number; dir?: string }[] = (input.secDims && input.secDims.length > 0)
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
    const cells = [String(it.no), it.part, `${it.qty} ${it.unit}`, it.childCode ?? it.remarks ?? ""];
    cells.forEach((c, k) => { ents += text(colX[k]! + 60, y, 90, c.slice(0, 38), "TABLE"); n++; });
  });

  ents += text(0, W + 300, 90, `EDIM ${input.code} - ASSEMBLY - DIM ${input.dimItem} (W${W} H${H} L${L})`); n++;

  return {
    dxf: wrap(ents),
    meta: { type: "assembly", sections, widthMm: W, heightMm: H, lengthMm: length, dimItem: input.dimItem, entities: n, items: items.length },
  };
}
