/**
 * H6 · p16 · p47 Output Data 템플릿 · 그래프 전용 data · 그래프 — 순수 함수(DB 를 모른다).
 *
 *   Output 값의 출처는 둘뿐이다: macro(그 스냅샷을 낸 승인 매크로 결과) · snapshot(스냅샷에 박힌 원가·치수·줄 수).
 *   여기서 새 계산식을 만들지 않는다 — 청사진의 밀도(kg/m³)는 승인 매크로가 그 값을 낼 때만 문서에 나온다.
 *   그래프 = 회사가 넣은 점(그래프 전용 data) + 선택한 Output 항목 값을 표시선으로. 문서를 만들 때 값째 body 에 박는다.
 */
export const OUTPUT_REFS: Record<string, string> = {
  "cost.material": "재료비", "cost.labor": "인건비", "cost.overhead": "경비", "cost.total": "원가 합계",
  "dims.W": "폭 W (mm)", "dims.H": "높이 H (mm)", "dims.L": "길이 L (mm)", "lines.count": "BOM 줄 수",
};
export const isOutputRef = (v: unknown): v is string => typeof v === "string" && Object.prototype.hasOwnProperty.call(OUTPUT_REFS, v);

export interface OutputDef { key: string; label: string; unit: string; source: string; ref: string | null }
export interface OutputDataValue { key: string; label: string; unit: string; source: "macro" | "snapshot"; ref: string | null; value: number | null; note?: string }
export interface RunValues { macroValue: number | null; cost: unknown; dims?: unknown; lines: unknown }

function pick(run: RunValues, ref: string): number | null {
  if (ref === "lines.count") return Array.isArray(run.lines) ? run.lines.length : null;
  const [head, k] = ref.split(".") as [string, string];
  const obj = head === "cost" ? run.cost : head === "dims" ? run.dims : null;
  const v = obj && typeof obj === "object" ? (obj as Record<string, unknown>)[k] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 스냅샷에서 Output 값을 읽는다. 없는 값은 지어내지 않고 null + 이유. */
export function resolveOutputs(defs: OutputDef[], run: RunValues): OutputDataValue[] {
  return defs.map((d) => {
    const base = { key: d.key, label: d.label, unit: d.unit, source: (d.source === "macro" ? "macro" : "snapshot") as "macro" | "snapshot", ref: d.ref };
    if (d.source === "macro") {
      const v = run.macroValue;
      return typeof v === "number" && Number.isFinite(v) ? { ...base, value: v } : { ...base, value: null, note: "아직 없음 — 승인 매크로 필요" };
    }
    const v = d.ref && isOutputRef(d.ref) ? pick(run, d.ref) : null;
    return v === null ? { ...base, value: null, note: "이 스냅샷에 없는 값" } : { ...base, value: v };
  });
}

export interface GraphPoint { x: string; y: number }
/** 그래프 전용 data — [{x, y}] 1~50점, x 는 글자(40자), y 는 수. 잘못되면 이유. */
export function parsePoints(raw: unknown): { ok: true; points: GraphPoint[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) return { ok: false, error: "점은 1~50개" };
  const out: GraphPoint[] = [];
  for (const [i, p] of raw.entries()) {
    const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
    const x = typeof o.x === "number" ? String(o.x) : typeof o.x === "string" ? o.x.trim().slice(0, 40) : "";
    const y = typeof o.y === "string" && o.y.trim() !== "" ? Number(o.y) : o.y;
    if (!x) return { ok: false, error: `${i + 1}번째 점의 x 가 비었습니다` };
    if (typeof y !== "number" || !Number.isFinite(y)) return { ok: false, error: `${i + 1}번째 점의 y 는 수` };
    out.push({ x, y });
  }
  return { ok: true, points: out };
}

/** "x,y" 줄들 → 점 (화면·마법사 입력용). 빈 줄은 건너뛴다. */
export function pointsFromText(text: string): unknown[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.lastIndexOf(",");
    return i < 0 ? { x: l, y: NaN } : { x: l.slice(0, i).trim(), y: Number(l.slice(i + 1).trim()) };
  });
}

export interface GraphDef { name: string; chart: string; xLabel: string; yLabel: string; points: unknown; markerKey: string | null }
export interface GraphSnap { name: string; chart: "bar" | "line"; xLabel: string; yLabel: string; points: GraphPoint[]; marker: { key: string; label: string; value: number } | null }

/** 문서를 만드는 순간의 그래프 — 점과 표시선 값을 body 에 박는다. 표시선 항목 값이 없으면 표시선 없이. */
export function snapshotGraphs(defs: GraphDef[], outputs: OutputDataValue[]): GraphSnap[] {
  return defs.flatMap((g) => {
    const p = parsePoints(g.points);
    if (!p.ok) return [];
    const o = g.markerKey ? outputs.find((x) => x.key === g.markerKey) : undefined;
    return [{ name: g.name, chart: g.chart === "bar" ? "bar" : "line", xLabel: g.xLabel, yLabel: g.yLabel, points: p.points,
      marker: o && o.value !== null ? { key: o.key, label: o.label, value: o.value } : null }];
  });
}

const escX = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** 그래프 SVG — 막대/선 + 표시선. 축 눈금은 0 ~ max(점, 표시선). 모든 글자는 이스케이프. */
export function graphSvg(g: GraphSnap): string {
  const W = 520, H = 260, L = 48, R = 12, T = 18, B = 40;
  const ys = [...g.points.map((p) => p.y), ...(g.marker ? [g.marker.value] : []), 0];
  const maxY = Math.max(...ys), minY = Math.min(...ys);
  const span = maxY - minY || 1;
  const X = (i: number) => L + ((W - L - R) * (g.points.length === 1 ? 0.5 : i / (g.points.length - 1)));
  const Y = (v: number) => T + (H - T - B) * (1 - (v - minY) / span);
  const bw = Math.max(4, ((W - L - R) / g.points.length) * 0.6);
  const bars = g.chart === "bar"
    ? g.points.map((p, i) => { const x = L + ((W - L - R) / g.points.length) * (i + 0.5); return `<rect x="${(x - bw / 2).toFixed(1)}" y="${Math.min(Y(p.y), Y(0)).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(Y(0) - Y(p.y)).toFixed(1)}" fill="#2f7d6d"/>`; }).join("")
    : `<polyline fill="none" stroke="#2f7d6d" stroke-width="2" points="${g.points.map((p, i) => `${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")}"/>` +
      g.points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3" fill="#2f7d6d"/>`).join("");
  const xl = g.points.map((p, i) => { const x = g.chart === "bar" ? L + ((W - L - R) / g.points.length) * (i + 0.5) : X(i); return `<text x="${x.toFixed(1)}" y="${H - B + 14}" font-size="10" text-anchor="middle">${escX(p.x)}</text>`; }).join("");
  const marker = g.marker ? `<line x1="${L}" x2="${W - R}" y1="${Y(g.marker.value).toFixed(1)}" y2="${Y(g.marker.value).toFixed(1)}" stroke="#c0392b" stroke-dasharray="5 3"/><text x="${W - R}" y="${(Y(g.marker.value) - 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#c0392b">${escX(g.marker.label)} ${escX(Math.round(g.marker.value * 1000) / 1000)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" data-chart="${g.chart}" data-points="${g.points.length}" data-marker="${g.marker ? escX(g.marker.value) : ""}" style="font-family:system-ui,sans-serif">`
    + `<rect width="100%" height="100%" fill="#fff"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#555"/><line x1="${L}" y1="${Y(Math.max(minY, 0)).toFixed(1)}" x2="${W - R}" y2="${Y(Math.max(minY, 0)).toFixed(1)}" stroke="#555"/>`
    + `<text x="${L - 6}" y="${T + 4}" font-size="10" text-anchor="end">${escX(Math.round(maxY * 100) / 100)}</text><text x="${L - 6}" y="${H - B}" font-size="10" text-anchor="end">${escX(Math.round(minY * 100) / 100)}</text>`
    + bars + xl + marker
    + `<text x="${(W + L) / 2}" y="${H - 6}" font-size="11" text-anchor="middle">${escX(g.xLabel)}</text><text x="12" y="${(H - B + T) / 2}" font-size="11" transform="rotate(-90 12 ${(H - B + T) / 2})" text-anchor="middle">${escX(g.yLabel)}</text></svg>`;
}
