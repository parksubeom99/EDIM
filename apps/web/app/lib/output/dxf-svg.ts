/**
 * F6 · p13 DWG View — 스냅샷에서 뽑은 **그 DXF** 를 SVG 로 옮긴다. 도면을 다시 계산하지 않는다(DXF 가 입력).
 * 우리 생성기(dxf.ts)가 쓰는 R12 엔티티만 읽는다: LINE · CIRCLE · TEXT. 그 밖은 건너뛰고 개수를 센다(skipped).
 * DXF 는 y 가 위로, SVG 는 아래로 — 뒤집어 그린다.
 */
const COLOR: Record<string, string> = { "0": "#1c2b2b", OUTLINE: "#1c2b2b", SECTION: "#2f8f83", DIM: "#b4232a", TEXT: "#1f4e8c", BALLOON: "#a0781c", TABLE: "#5a4b8a" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface DxfEntities {
  lines: { layer: string; x1: number; y1: number; x2: number; y2: number }[];
  circles: { layer: string; x: number; y: number; r: number }[];
  texts: { layer: string; x: number; y: number; h: number; value: string }[];
  skipped: number;
}

export function readDxfEntities(dxf: string): DxfEntities {
  const t = dxf.replace(/\r\n/g, "\n").split("\n");
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < t.length; i += 2) pairs.push([t[i]!.trim(), t[i + 1]!]);
  const out: DxfEntities = { lines: [], circles: [], texts: [], skipped: 0 };
  let inEnt = false;
  for (let i = 0; i < pairs.length; i++) {
    const [c, v] = pairs[i]!;
    if (c === "2" && v.trim() === "ENTITIES") { inEnt = true; continue; }
    if (c === "0" && v.trim() === "ENDSEC") { inEnt = false; continue; }
    if (!inEnt || c !== "0") continue;
    const type = v.trim();
    const g: Record<string, string> = {};
    let j = i + 1;
    for (; j < pairs.length && pairs[j]![0] !== "0"; j++) g[pairs[j]![0]] = pairs[j]![1];
    const n = (k: string) => Number(g[k] ?? 0);
    const layer = (g["8"] ?? "0").trim();
    if (type === "LINE") out.lines.push({ layer, x1: n("10"), y1: n("20"), x2: n("11"), y2: n("21") });
    else if (type === "CIRCLE") out.circles.push({ layer, x: n("10"), y: n("20"), r: n("40") });
    else if (type === "TEXT") out.texts.push({ layer, x: n("10"), y: n("20"), h: n("40") || 50, value: g["1"] ?? "" });
    else out.skipped++;
    i = j - 1;
  }
  return out;
}

export function dxfToSvg(dxf: string): { svg: string; counts: { lines: number; circles: number; texts: number; skipped: number } } {
  const e = readDxfEntities(dxf);
  const xs: number[] = [], ys: number[] = [];
  for (const l of e.lines) { xs.push(l.x1, l.x2); ys.push(l.y1, l.y2); }
  for (const c of e.circles) { xs.push(c.x - c.r, c.x + c.r); ys.push(c.y - c.r, c.y + c.r); }
  for (const t of e.texts) { xs.push(t.x, t.x + t.h * Math.max(t.value.length, 1) * 0.6); ys.push(t.y, t.y + t.h); }
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1), minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
  const pad = Math.max(maxX - minX, maxY - minY) * 0.03;
  const W = maxX - minX + pad * 2, H = maxY - minY + pad * 2;
  const X = (x: number) => (x - minX + pad).toFixed(1), Y = (y: number) => (maxY - y + pad).toFixed(1);
  const sw = (Math.max(W, H) / 900).toFixed(2);
  const body = [
    ...e.lines.map((l) => `<line x1="${X(l.x1)}" y1="${Y(l.y1)}" x2="${X(l.x2)}" y2="${Y(l.y2)}" stroke="${COLOR[l.layer] ?? "#1c2b2b"}"/>`),
    ...e.circles.map((c) => `<circle cx="${X(c.x)}" cy="${Y(c.y)}" r="${c.r.toFixed(1)}" fill="none" stroke="${COLOR[c.layer] ?? "#1c2b2b"}"/>`),
    ...e.texts.map((t) => `<text x="${X(t.x)}" y="${Y(t.y)}" font-size="${t.h.toFixed(1)}" fill="${COLOR[t.layer] ?? "#1f4e8c"}" font-family="monospace">${esc(t.value)}</text>`),
  ].join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" stroke-width="${sw}" data-lines="${e.lines.length}" data-circles="${e.circles.length}" data-texts="${e.texts.length}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
  return { svg, counts: { lines: e.lines.length, circles: e.circles.length, texts: e.texts.length, skipped: e.skipped } };
}
