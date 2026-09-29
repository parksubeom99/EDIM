import type { InternalReport, BenchRow } from "./consulting-run";

/** ccmd K · KB — 컨설팅 제안서 A4 HTML(순수 함수). 숫자는 전부 받은 보고서 값 — 여기서 다시 계산하지 않는다. */
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmt = (n: number | null, unit: string) => n === null ? "—" : unit === "₩/CMH" ? `₩${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}` : n.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
const KIND: Record<string, string> = { supplier: "공급처", fan: "팬 효율", margin: "설계 여유" };

export function consultingHtml(rep: InternalReport, bench: BenchRow[]): string {
  const rows = rep.proposals.length
    ? rep.proposals.map((p, i) => `<tr data-kind="${p.kind}"><td>${i + 1}</td><td>${KIND[p.kind]}</td><td><b>${esc(p.title)}</b><br><span class="muted">${esc(p.detail)}</span></td><td class="n">${p.saving ? `${p.saving.amount.toLocaleString("ko-KR")} ${p.saving.unit === "KRW" ? "원" : "kWh/년"}` : "—"}</td><td class="mono small">${p.evidence.map((e) => `${esc(e.kind)}:${esc(e.id)}`).join("<br>")}</td></tr>`).join("")
    : `<tr><td colspan="5" class="muted">이 스냅샷에서 찾은 제안이 없습니다.</td></tr>`;
  const b = bench.map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${r.n}</td>${r.suppressed ? `<td colspan="4" class="muted">표본이 3곳 미만이라 보여 드리지 않습니다</td>` : `<td class="n">${fmt(r.p25, r.unit)}</td><td class="n">${fmt(r.p50, r.unit)}</td><td class="n">${fmt(r.p75, r.unit)}</td><td class="n">${fmt(r.mine, r.unit)}${r.percentile !== null ? ` · 백분위 ${r.percentile}` : ""}</td>`}</tr>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>컨설팅 제안서 · ${esc(rep.code)}</title>
<style>
@page{size:A4;margin:14mm}
body{font-family:system-ui,"Malgun Gothic",sans-serif;color:#111;margin:24px;max-width:190mm}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px}
table{border-collapse:collapse;width:100%;font-size:11.5px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}.n{text-align:right;white-space:nowrap}
.muted{color:#666}.mono{font-family:ui-monospace,Consolas,monospace}.small{font-size:10px}
footer{margin-top:18px;border-top:1px solid #999;padding-top:6px;font-size:10.5px;color:#444}
</style></head><body data-testid="consulting-print">
<h1>컨설팅 제안서 — 내부 최적안 (읽기 전용)</h1>
<p class="muted">제품 코드 <span class="mono">${esc(rep.code)}</span> · BOM 스냅샷 ${esc(rep.createdAt.slice(0, 10))} · 제안 ${rep.proposals.length}건 · 합계 절감 ₩${rep.totals.krw.toLocaleString("ko-KR")} · ${rep.totals.kwh.toLocaleString("ko-KR")} kWh/년</p>
<h2>트랙 1 · 내부 최적안</h2>
<table><tr><th>#</th><th>분류</th><th>제안</th><th class="n">절감</th><th>근거 행</th></tr>${rows}</table>
<p class="muted">팬 효율: ${esc(rep.fanNote)}</p>
<h2>트랙 2 · 업계 안 우리 위치 (익명 · 집계)</h2>
<table><tr><th>지표</th><th class="n">표본 n</th><th class="n">p25</th><th class="n">p50</th><th class="n">p75</th><th class="n">우리 값</th></tr>${b}</table>
<p class="muted">다른 회사의 이름 · 행 값은 이 문서에 없습니다(DB 함수가 집계 숫자만 줍니다). 표본에 샘플 회사 값이 들어 있습니다.</p>
<footer data-testid="consulting-print-footer">스냅샷 <span class="mono">${esc(rep.runId)}</span> · 분석 날짜 ${esc(rep.analyzedOn)} · 가정 운전시간 ${rep.hoursPerYear.toLocaleString("ko-KR")} h/년 · <b>샘플 단가 · 샘플 운전시간</b> — 제안은 적용 버튼이 없습니다(적용은 사람이 기존 화면에서).</footer>
</body></html>`;
}
